const fs = require('fs');
const files = [
  'src/pages/AdminVendors.tsx',
  'src/pages/AdminCustomers.tsx',
  'src/pages/AdminAuditors.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // Apply readonly hack to email
  content = content.replace(/type="email" className="db-input" autoComplete="off" name="random_email_field" id="random_email_field" value={formData\.email}/g, 
    'type="email" className="db-input" autoComplete="off" readOnly onFocus={e => e.target.removeAttribute(\\'readOnly\\')} value={formData.email}');
  
  // If the previous replace failed because it was different
  content = content.replace(/type="email" className="db-input" autoComplete="new-email" value={formData\.email}/g, 
    'type="email" className="db-input" autoComplete="off" readOnly onFocus={e => e.target.removeAttribute(\\'readOnly\\')} value={formData.email}');

  // Apply readonly hack to password
  content = content.replace(/type="password" minLength={6} className="db-input" autoComplete="new-password" name="random_password_field" id="random_password_field" value={formData\.password}/g, 
    'type="password" minLength={6} className="db-input" autoComplete="new-password" readOnly onFocus={e => e.target.removeAttribute(\\'readOnly\\')} value={formData.password}');
    
  // If the previous replace failed because it was different
  content = content.replace(/type="password" minLength={6} className="db-input" autoComplete="new-password" value={formData\.password}/g, 
    'type="password" minLength={6} className="db-input" autoComplete="new-password" readOnly onFocus={e => e.target.removeAttribute(\\'readOnly\\')} value={formData.password}');

  fs.writeFileSync(file, content);
}
console.log('Readonly hack applied.');
