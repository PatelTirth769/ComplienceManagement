const path = require('path');
const config = require('./config');
const { syncChecklistJsonFiles } = require('./services/excelService');
// Ensure checklist JSON files are synced from reference Excel files BEFORE app loads
try {
  const referenceDir = path.resolve(__dirname, '../../reference_files');
  const dataDir = path.resolve(__dirname, './data');
  const counts = syncChecklistJsonFiles(referenceDir, dataDir);
  console.log(`[Excel Sync]: Extracted Other Vendor items: ${counts.otherCount}, Security Vendor items: ${counts.securityCount}`);
} catch (err) {
  console.warn('[Excel Sync Warning]: Could not auto-sync Excel files:', err.message);
}

const app = require('./app');

const PORT = config.port;

const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Compliance Calculator API Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log(`==================================================`);
});

module.exports = server;
