const fs = require('fs');
const files = [
  'src/pages/AdminCreateAudit.tsx',
  'src/pages/AdminVendors.tsx',
  'src/pages/AdminCustomers.tsx',
  'src/pages/AdminChecklist.tsx'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace grids
  content = content.replace(/className="grid grid-cols-1 md:grid-cols-2 gap-4"/g, 'className="db-form-grid"');
  content = content.replace(/className="grid grid-cols-1 md:grid-cols-2 gap-6"/g, 'className="db-form-grid"');

  // Replace labels
  content = content.replace(/className="block text-sm font-semibold mb-1"/g, 'className="db-label"');
  content = content.replace(/className="block text-sm font-semibold mb-2"/g, 'className="db-label"');
  
  // Replace inputs and selects
  content = content.replace(/className="w-full border p-2 rounded"/g, 'className="db-input"');
  content = content.replace(/<select required className="db-input"/g, '<select required className="db-select"');
  content = content.replace(/<select className="db-input"/g, '<select className="db-select"');
  
  fs.writeFileSync(file, content);
}
console.log('Done');
