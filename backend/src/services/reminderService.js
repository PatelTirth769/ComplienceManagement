const cron = require('node-cron');
const { getDb } = require('../config/firebase');
const { formatDate, parseFlexibleDate, toIsoDate } = require('../utils/dateUtils');
const emailService = require('./emailService');

/**
 * Checks all active audits and dispatches automated reminder emails to vendors
 * who have not uploaded documents after Day 1 of the audit timeline.
 * 
 * @returns {Promise<Object>} Execution summary with counts
 */
async function checkAndSendVendorDocumentReminders() {
  console.log(`[Reminder Service]: Running automated document upload check at ${new Date().toISOString()}...`);
  const db = getDb();
  if (!db) {
    console.warn('[Reminder Service]: Firestore DB not initialized, skipping check.');
    return { success: false, error: 'DB not initialized' };
  }

  const results = {
    auditsChecked: 0,
    remindersSent: 0,
    skippedAlreadyUploaded: 0,
    skippedNotYetDueForReminder: 0,
    skippedAlreadySentToday: 0,
    errors: []
  };

  try {
    const auditsRef = db.collection('audits');
    const snapshot = await auditsRef.get();
    const now = new Date();
    const todayStr = toIsoDate(now);

    // Cache user lookups
    const usersCache = new Map();
    async function getUser(userId) {
      if (!userId) return null;
      if (usersCache.has(userId)) return usersCache.get(userId);
      try {
        const doc = await db.collection('users').doc(userId).get();
        if (doc.exists) {
          usersCache.set(userId, doc.data());
          return doc.data();
        }
      } catch (e) {
        console.warn(`[Reminder Service]: Error fetching user ${userId}:`, e.message);
      }
      return null;
    }

    for (const doc of snapshot.docs) {
      results.auditsChecked++;
      const audit = doc.data();
      const statusLower = (audit.status || '').toLowerCase();

      // Only check active/scheduled/in-progress audits (skip closed or cancelled audits)
      if (['closed', 'completed', 'approved', 'cancelled'].includes(statusLower)) {
        continue;
      }

      // 1. Check if vendor has already uploaded documents
      const docsList = Array.isArray(audit.documents) ? audit.documents : [];
      if (docsList.length > 0) {
        results.skippedAlreadyUploaded++;
        continue;
      }

      // Check external documents collection just in case
      try {
        const docCountSnap = await db.collection('documents')
          .where('auditId', '==', doc.id)
          .limit(1)
          .get();
        if (!docCountSnap.empty) {
          results.skippedAlreadyUploaded++;
          continue;
        }
      } catch (e) {
        // Continue with doc data
      }

      // 2. Check timeline / days elapsed
      const startDateStr = audit.startDate || audit.createdAt;
      const startDate = parseFlexibleDate(startDateStr);
      if (!startDate) {
        continue;
      }

      // Compare start date vs today (midnight to midnight)
      const startMidnight = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
      const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diffTime = todayMidnight.getTime() - startMidnight.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      // Rule: If timeline has started and first day has passed (diffDays >= 1)
      if (diffDays < 1) {
        results.skippedNotYetDueForReminder++;
        continue;
      }

      // Skip if audit due date was more than 14 days ago to avoid stale notifications
      if (audit.dueDate) {
        const dueDate = parseFlexibleDate(audit.dueDate);
        if (dueDate) {
          const dueMidnight = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());
          const daysOverdue = Math.floor((todayMidnight.getTime() - dueMidnight.getTime()) / (1000 * 60 * 60 * 24));
          if (daysOverdue > 14) {
            continue;
          }
        }
      }

      // 3. Avoid duplicate reminder on the same calendar day
      if (audit.lastDocumentReminderDate === todayStr) {
        results.skippedAlreadySentToday++;
        continue;
      }

      // 4. Resolve vendor details
      const vendorUser = await getUser(audit.vendorId);
      const vendorEmail = audit.vendorEmail || vendorUser?.email;
      const vendorName = audit.vendorName || vendorUser?.companyName || vendorUser?.name || 'Vendor Partner';

      if (!vendorEmail) {
        console.warn(`[Reminder Service]: No email found for vendorId: ${audit.vendorId} on audit ${audit.auditIdString || doc.id}`);
        continue;
      }

      // 5. Send automated reminder email
      try {
        const auditIdString = audit.auditIdString || doc.id;
        const auditPeriod = audit.auditPeriod || audit.auditMonth || 'Current Period';

        const sendRes = await emailService.sendVendorDocumentReminderEmail({
          vendorEmail,
          vendorName,
          auditIdString,
          auditPeriod,
          startDate: formatDate(audit.startDate || audit.createdAt),
          dueDate: formatDate(audit.dueDate),
          daysElapsed: diffDays
        });

        // 6. Update audit record with reminder tracking and timeline event
        const timeline = Array.isArray(audit.timeline) ? [...audit.timeline] : [];
        timeline.push({
          event: 'Document Upload Reminder Sent',
          status: audit.status || 'Scheduled',
          timestamp: new Date().toISOString(),
          actor: 'System (Automated)',
          notes: `Day ${diffDays} automated morning reminder email dispatched to ${vendorEmail} for pending statutory compliance document upload.`
        });

        await db.collection('audits').doc(doc.id).update({
          lastDocumentReminderDate: todayStr,
          documentReminderCount: (audit.documentReminderCount || 0) + 1,
          timeline
        });

        // 7. Also create in-app notification in vendor feed
        try {
          await db.collection('notifications').add({
            userId: audit.vendorId,
            role: 'Vendor',
            title: '⚠️ Action Required: Upload Compliance Documents',
            message: `Audit ${auditIdString} (${auditPeriod}) is in progress (Day ${diffDays}). Please upload mandatory statutory compliance documents so the auditor can evaluate compliance.`,
            auditId: doc.id,
            type: 'document_reminder',
            read: false,
            createdAt: new Date().toISOString()
          });
        } catch (notifErr) {
          console.warn('[Reminder Service]: Could not save in-app notification record:', notifErr.message);
        }

        results.remindersSent++;
        console.log(`[Reminder Service]: Successfully sent document upload reminder to ${vendorEmail} for audit ${auditIdString} (Day ${diffDays})`);
      } catch (sendErr) {
        console.error(`[Reminder Service]: Error dispatching reminder for audit ${doc.id}:`, sendErr.message);
        results.errors.push({ auditId: doc.id, error: sendErr.message });
      }
    }

    console.log(`[Reminder Service Summary]: Checked: ${results.auditsChecked}, Sent: ${results.remindersSent}, Already Uploaded: ${results.skippedAlreadyUploaded}, Not Due: ${results.skippedNotYetDueForReminder}, Sent Today: ${results.skippedAlreadySentToday}`);
    return { success: true, ...results };
  } catch (error) {
    console.error('[Reminder Service Fatal Error]:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Initializes the automated reminder cron job to run every morning at 09:00 AM (IST / server local time).
 */
function startReminderCron() {
  // Cron schedule: '0 9 * * *' = every day at 09:00 AM
  // For safety and configurability, cron expression can also be set via REMINDER_CRON_SCHEDULE in .env
  const schedule = process.env.REMINDER_CRON_SCHEDULE || '0 9 * * *';

  cron.schedule(schedule, async () => {
    console.log(`[Reminder Service]: Triggered scheduled daily morning check (${schedule})...`);
    await checkAndSendVendorDocumentReminders();
  });

  console.log(`[Reminder Service]: Automated vendor document reminder cron job active (Schedule: "${schedule}" - 9:00 AM Daily).`);
}

module.exports = {
  checkAndSendVendorDocumentReminders,
  startReminderCron
};
