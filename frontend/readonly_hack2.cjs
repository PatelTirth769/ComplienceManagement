const fs = require('fs');
const files = [
  'src/pages/AdminCustomers.tsx',
  'src/pages/AdminAuditors.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  // Apply readonly hack to email
  content = content.replace(/<input required type="email" className="db-input" autoComplete="off" name="random_email_field" id="random_email_field" value={formData\.email}/g, 
    '<input required type="email" className="db-input" autoComplete="off" readOnly onFocus={e => e.target.removeAttribute(\\'readOnly\\')} name="random_email_field" id="random_email_field" value={formData.email}');

  // Apply readonly hack to password (sometimes it has random_password_field, sometimes not depending on my previous replace)
  content = content.replace(/<input required type="password" minLength={6} className="db-input" value={formData\.password}/g, 
    '<input required type="password" minLength={6} className="db-input" autoComplete="new-password" readOnly onFocus={e => e.target.removeAttribute(\\'readOnly\\')} name="random_password_field" id="random_password_field" value={formData.password}');
    
  fs.writeFileSync(file, content);
}
console.log('Readonly applied to Customers and Auditors');
