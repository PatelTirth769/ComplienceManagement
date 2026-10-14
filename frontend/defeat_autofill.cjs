const fs = require('fs');
const files = [
  'src/pages/AdminVendors.tsx',
  'src/pages/AdminCustomers.tsx',
  'src/pages/AdminAuditors.tsx'
];

for (const file of files) {
  if (!fs.existsSync(file)) continue;
  let content = fs.readFileSync(file, 'utf8');
  
  const dummyFields = `
              {/* Dummy fields to trick browser autofill */}
              <input type="email" name="fake_email" style={{display: 'none'}} aria-hidden="true" />
              <input type="password" name="fake_password" style={{display: 'none'}} aria-hidden="true" />
              `;
              
  // Insert right after the <form ...>
  content = content.replace(/(<form[^>]+>)/, '$1' + dummyFields);
  
  // As a secondary measure, let's also change the type="password" to type="text" initially, 
  // but it's a React controlled component so it's easier to just use a random autoComplete
  content = content.replace(/autoComplete="new-email"/g, 'autoComplete="off" name="random_email_field" id="random_email_field"');
  content = content.replace(/autoComplete="new-password"/g, 'autoComplete="new-password" name="random_password_field" id="random_password_field"');
  
  fs.writeFileSync(file, content);
}
console.log('Dummy fields added to defeat autofill.');
