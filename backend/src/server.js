const path = require('path');
const config = require('./config');
const { syncChecklistJsonFiles } = require('./services/excelService');
const app = require('./app');

// Ensure checklist JSON files are synced from reference Excel files
try {
  const referenceDir = path.resolve(__dirname, '../../reference_files');
  const dataDir = path.resolve(__dirname, './data');
  const counts = syncChecklistJsonFiles(referenceDir, dataDir);
  console.log(`[Excel Sync]: Extracted Other Vendor items: ${counts.otherCount}, Security Vendor items: ${counts.securityCount}`);
} catch (err) {
  console.warn('[Excel Sync Warning]: Could not auto-sync Excel files:', err.message);
}

const PORT = config.port;

// Start automated daily morning reminder cron job
try {
  const { startReminderCron } = require('./services/reminderService');
  startReminderCron();
} catch (cronErr) {
  console.warn('[Reminder Service Warning]: Could not initialize cron job:', cronErr.message);
}

const server = app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`Compliance Calculator API Server running on port ${PORT}`);
  console.log(`Environment: ${config.nodeEnv}`);
  console.log(`Health Check: http://localhost:${PORT}/api/health`);
  console.log(`==================================================`);
});

module.exports = server;
