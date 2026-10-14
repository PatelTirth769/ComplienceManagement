const fs = require('fs');
const file = 'src/index.css';
let content = fs.readFileSync(file, 'utf8');

const oldCss = `/* Production Admin Form Styling */
.db-input, .db-select {
  width: 100%;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  padding: 0.625rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 0.5rem;
  background-color: #ffffff;
  color: var(--color-text-primary);
  outline: none;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.db-input:focus, .db-select:focus {
  border-color: #1565C0;
  box-shadow: 0 0 0 3px rgba(21, 101, 192, 0.12);
}`;

const newCss = `/* Production Admin Form Styling */
.db-input, .db-select {
  width: 100%;
  font-family: var(--font-sans);
  font-size: 0.875rem;
  padding: 0.625rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background-color: #f8fafc;
  color: #1e293b;
  outline: none;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.02);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
.db-input:hover, .db-select:hover {
  background-color: #ffffff;
  border-color: #94a3b8;
}
.db-input:focus, .db-select:focus {
  background-color: #ffffff;
  border-color: #2563eb;
  box-shadow: 0 0 0 4px rgba(37, 99, 235, 0.15);
}`;

content = content.replace(oldCss, newCss);

// Also let's make the card header/body look better for add forms
const addCardEnhancement = `
.db-card {
  background-color: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  overflow: hidden;
}
.db-card-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  background-color: #f8fafc;
}
.db-card-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: #0f172a;
}
.db-card-body {
  padding: 1.5rem;
}
`;

content += '\\n' + addCardEnhancement;

fs.writeFileSync(file, content);
console.log('CSS upgraded');
