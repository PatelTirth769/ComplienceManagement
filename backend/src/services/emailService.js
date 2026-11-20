const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
require('dotenv').config();
const nodemailer = require('nodemailer');

/**
 * Creates and caches the nodemailer transporter based on environment config.
 */
function getTransporter() {
  const user = (process.env.SMTP_USER || 'nagpalrahul987@gmail.com').trim();
  const rawPass = process.env.SMTP_PASS;
  const pass = rawPass ? rawPass.replace(/\s+/g, '').trim() : null;
  const host = (process.env.SMTP_HOST || 'smtp.gmail.com').trim();

  if (user && pass && pass !== 'your-google-app-password' && pass !== 'your-app-password') {
    if (user.endsWith('@gmail.com') || host === 'smtp.gmail.com') {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user,
          pass
        }
      });
    }

    return nodemailer.createTransport({
      host,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user,
        pass
      }
    });
  }

  return null;
}

/**
 * Sends an email, or logs it to console if SMTP credentials are not yet configured.
 * @param {Object} options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text version
 * @param {string} options.html - HTML version
 * @returns {Promise<Object>}
 */
async function sendEmail({ to, subject, text, html }) {
  const user = (process.env.SMTP_USER || 'nagpalrahul987@gmail.com').trim();
  const from = process.env.EMAIL_FROM || `"Compliance Platform" <${user}>`;
  const transporter = getTransporter();

  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from,
        to,
        replyTo: user,
        subject,
        text,
        html,
        headers: {
          'X-Auto-Response-Suppress': 'OOF, AutoReply'
        }
      });
      console.log(`[Email Service]: Email delivered to ${to} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, simulated: false };
    } catch (err) {
      console.error(`[Email Service Error]: Failed to send email via SMTP to ${to}:`, err.message);
      // Fallback to simulated delivery so reminder workflow is never completely blocked
      console.log(`[Email Service Fallback]: Email logged for ${to}: "${subject}"`);
      return { success: false, error: err.message, simulated: true };
    }
  }

  // Simulated delivery for local development when SMTP is not configured
  console.log(`=======================================================`);
  console.log(`[Email Service - Simulated Delivery]:`);
  console.log(`From:    ${from}`);
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body snippet: ${text.slice(0, 160)}...`);
  console.log(`=======================================================`);

  return { success: true, simulated: true };
}

/**
 * Sends a rich, branded reminder email to the vendor for pending document upload.
 * 
 * @param {Object} params
 * @param {string} params.vendorEmail - Vendor's email address
 * @param {string} params.vendorName - Vendor's human or company name
 * @param {string} params.auditIdString - Audit code e.g. AUD-2026-0009
 * @param {string} params.auditPeriod - Audit period e.g. H1 2026 (Jan-Jun)
 * @param {string} params.startDate - Audit cycle start date (DD/MM/YYYY or YYYY-MM-DD)
 * @param {string} params.dueDate - Audit cycle due date (DD/MM/YYYY or YYYY-MM-DD)
 * @param {number} params.daysElapsed - Number of days elapsed since audit began
 * @param {string} [params.portalUrl] - Base URL for the platform
 * @returns {Promise<Object>}
 */
async function sendVendorDocumentReminderEmail({
  vendorEmail,
  vendorName = 'Vendor Partner',
  auditIdString = 'AUDIT',
  auditPeriod = 'Current Period',
  startDate = 'N/A',
  dueDate = 'N/A',
  daysElapsed = 1,
  portalUrl = process.env.FRONTEND_URL || 'http://localhost:5174'
}) {
  const subject = `Pending Compliance Documents: Audit ${auditIdString} (${auditPeriod})`;

  const text = `
Dear ${vendorName},

This is an automated reminder regarding your scheduled statutory compliance audit ${auditIdString} for period ${auditPeriod}.

Audit Start Date: ${startDate}
Audit Due Date:   ${dueDate}
Days Elapsed:     ${daysElapsed} day(s)

Our records indicate that no compliance documents have been uploaded for this audit yet. 
Your auditor requires these documents (such as statutory registers, monthly returns, challans, and wage sheets) to proceed with compliance assessment and scoring.

Please log in to the Vendor Portal and upload the required documents as soon as possible:
${portalUrl}/vendor/documents

Thank you for your prompt cooperation.
Compliance Management Team
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Document Upload Reminder</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1E3A8A 0%, #0F172A 100%); padding: 24px 32px; color: #FFFFFF; }
    .header h1 { margin: 0 0 6px; font-size: 20px; font-weight: 700; letter-spacing: -0.01em; }
    .header p { margin: 0; font-size: 13px; color: #94A3B8; }
    .body { padding: 32px; }
    .greeting { font-size: 15px; font-weight: 600; margin-bottom: 12px; color: #0F172A; }
    .lead { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .alert-box { background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: center; gap: 12px; }
    .alert-text { font-size: 13px; color: #92400E; font-weight: 600; line-height: 1.4; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; background: #F8FAFC; border-radius: 8px; overflow: hidden; }
    .details-table th, .details-table td { padding: 10px 16px; font-size: 13px; text-align: left; border-bottom: 1px solid #E2E8F0; }
    .details-table th { width: 40%; color: #64748B; font-weight: 600; }
    .details-table td { color: #0F172A; font-weight: 700; }
    .btn-container { text-align: center; margin: 32px 0 16px; }
    .btn { display: inline-block; background: #1565C0; color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 2px 6px rgba(21, 101, 192, 0.3); }
    .footer { padding: 20px 32px; background: #F1F5F9; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Compliance Management Platform</h1>
      <p>Automated Statutory Audit Notification System</p>
    </div>
    <div class="body">
      <div class="greeting">Dear ${vendorName},</div>
      <p class="lead">
        This is an automated reminder regarding the compliance audit scheduled for your organization. Day ${daysElapsed} of the audit cycle has elapsed, and our system shows that <strong>no compliance verification documents have been uploaded yet</strong>.
      </p>

      <div class="alert-box">
        <span style="font-size: 20px;">⚠️</span>
        <div class="alert-text">
          Document upload is mandatory. The assigned auditor cannot start evaluating your compliance score until these documents are submitted.
        </div>
      </div>

      <table class="details-table">
        <tr>
          <th>Audit Reference ID</th>
          <td>${auditIdString}</td>
        </tr>
        <tr>
          <th>Audit Cycle / Period</th>
          <td>${auditPeriod}</td>
        </tr>
        <tr>
          <th>Cycle Start Date</th>
          <td>${startDate}</td>
        </tr>
        <tr>
          <th>Final Due Date</th>
          <td>${dueDate}</td>
        </tr>
        <tr>
          <th>Document Status</th>
          <td style="color: #DC2626;">0 Documents Uploaded (Action Required)</td>
        </tr>
      </table>

      <div class="btn-container">
        <a href="${portalUrl}/vendor/documents" class="btn">Upload Compliance Documents Now &rarr;</a>
      </div>
    </div>
    <div class="footer">
      This is an automated system notification from the Compliance Platform.<br>
      Please do not reply directly to this email. If you have questions, please reach out to your auditor or compliance administrator.
    </div>
  </div>
</body>
</html>
`.trim();

  return sendEmail({
    to: vendorEmail,
    subject,
    text,
    html
  });
}

/**
 * Sends an immediate notification email to the vendor when a new audit is scheduled by admin.
 * 
 * @param {Object} params
 * @param {string} params.vendorEmail - Vendor's email address
 * @param {string} params.vendorName - Vendor's human or company name
 * @param {string} [params.customerName] - Enterprise Client / Organization name
 * @param {string} [params.auditorName] - Assigned Auditor name
 * @param {string} params.auditIdString - Audit code e.g. AUD-2026-0009
 * @param {string} params.auditPeriod - Audit period e.g. Q4 2026 (Oct–Dec)
 * @param {string} params.startDate - Audit cycle start date (DD/MM/YYYY or YYYY-MM-DD)
 * @param {string} params.dueDate - Audit cycle due date (DD/MM/YYYY or YYYY-MM-DD)
 * @param {string} [params.establishmentType] - Type of establishment (Factory, Commercial, etc.)
 * @param {string} [params.state] - State / Location
 * @param {string} [params.portalUrl] - Base URL for the platform
 * @returns {Promise<Object>}
 */
async function sendAuditScheduledEmail({
  vendorEmail,
  vendorName = 'Vendor Partner',
  customerName = 'Enterprise Client',
  auditorName = 'Assigned Auditor',
  auditIdString = 'AUDIT',
  auditPeriod = 'Current Period',
  startDate = 'N/A',
  dueDate = 'N/A',
  establishmentType = '',
  state = '',
  portalUrl = process.env.FRONTEND_URL || 'http://localhost:5174'
}) {
  const subject = `Compliance Audit Scheduled: Document Submission Required (${auditIdString} - ${auditPeriod})`;

  const text = `
Dear ${vendorName},

A new statutory compliance audit has been scheduled for your organization on the Compliance Management Platform.

Audit Reference ID: ${auditIdString}
Audit Cycle/Period: ${auditPeriod}
Enterprise Client:  ${customerName}
Assigned Auditor:   ${auditorName}
Scheduled Start:    ${startDate}
Compliance Due:     ${dueDate}
${establishmentType ? `Establishment:       ${establishmentType}\n` : ''}${state ? `State/Jurisdiction:  ${state}\n` : ''}
DOCUMENT SUBMISSION REQUIRED:
Please log in to your Vendor Portal and upload all required statutory compliance documents (e.g., wage registers, PF/ESI challans, statutory registers, and monthly returns) as soon as possible. 

Your assigned auditor requires these documents to evaluate your statutory compliance score.

Access the Vendor Portal to upload your documents:
${portalUrl}/vendor/documents

Thank you for your prompt cooperation.
Compliance Management Platform
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Compliance Audit Scheduled</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #0F766E 0%, #1E3A8A 100%); padding: 28px 32px; color: #FFFFFF; }
    .header-badge { display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    .header p { margin: 0; font-size: 13px; color: #E2E8F0; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #0F172A; }
    .lead { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .action-banner { background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px; }
    .action-icon { font-size: 20px; line-height: 1; }
    .action-title { font-size: 13px; font-weight: 700; color: #166534; margin: 0 0 2px; }
    .action-desc { font-size: 12.5px; color: #15803D; margin: 0; line-height: 1.4; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; background: #F8FAFC; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; }
    .details-table th, .details-table td { padding: 10px 16px; font-size: 13px; text-align: left; border-bottom: 1px solid #E2E8F0; }
    .details-table th { width: 38%; color: #64748B; font-weight: 600; background: #F1F5F9; }
    .details-table td { color: #0F172A; font-weight: 700; }
    .btn-container { text-align: center; margin: 32px 0 16px; }
    .btn { display: inline-block; background: #0F766E; color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 32px; border-radius: 8px; box-shadow: 0 3px 8px rgba(15, 118, 110, 0.35); transition: background 0.2s; }
    .footer { padding: 20px 32px; background: #F1F5F9; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-badge">Audit Engagement Initiated</div>
      <h1>Compliance Management Platform</h1>
      <p>Automated Statutory Audit Notification System</p>
    </div>
    <div class="body">
      <div class="greeting">Dear ${vendorName},</div>
      <p class="lead">
        A new statutory compliance audit has been formally scheduled for your organization. Please review the audit details below and begin uploading the required statutory verification documents.
      </p>

      <div class="action-banner">
        <span class="action-icon">📂</span>
        <div>
          <div class="action-title">Action Required: Upload Compliance Documents</div>
          <div class="action-desc">
            Your assigned auditor cannot begin evaluating your compliance score until you upload your required documents (such as statutory registers, wage sheets, and challans).
          </div>
        </div>
      </div>

      <table class="details-table">
        <tr>
          <th>Audit Reference ID</th>
          <td style="color: #0F766E;">${auditIdString}</td>
        </tr>
        <tr>
          <th>Audit Cycle / Period</th>
          <td>${auditPeriod}</td>
        </tr>
        <tr>
          <th>Enterprise Client</th>
          <td>${customerName}</td>
        </tr>
        <tr>
          <th>Assigned Auditor</th>
          <td>${auditorName}</td>
        </tr>
        <tr>
          <th>Scheduled Start Date</th>
          <td>${startDate}</td>
        </tr>
        <tr>
          <th>Compliance Due Date</th>
          <td>${dueDate}</td>
        </tr>
        ${establishmentType ? `<tr><th>Establishment Type</th><td>${establishmentType}</td></tr>` : ''}
        ${state && state !== 'N/A' ? `<tr><th>State / Jurisdiction</th><td>${state}</td></tr>` : ''}
      </table>

      <div class="btn-container">
        <a href="${portalUrl}/vendor/documents" class="btn">Upload Compliance Documents Now &rarr;</a>
      </div>
    </div>
    <div class="footer">
      This is an automated system notification from the Compliance Management Platform.<br>
      Sender: Compliance Administration &bull; nagpalrahul987@gmail.com<br>
      Please do not reply directly to this email. For questions, contact your auditor or platform administrator.
    </div>
  </div>
</body>
</html>
`.trim();

  return sendEmail({
    to: vendorEmail,
    subject,
    text,
    html
  });
}

/**
 * Sends an automated interview schedule email to the auditor containing auto-generated
 * Login ID and Password for each candidate and a blue "here" link to open the login page in another window.
 *
 * @param {Object} params
 * @param {string} params.recipientEmail - Auditor's email address
 * @param {string} [params.auditorName] - Auditor's name
 * @param {string} params.auditIdString - Audit code e.g. AUD-2026-0009
 * @param {string} [params.auditPeriod] - Audit cycle / period
 * @param {Array} params.resources - Array of scheduled resources with name, loginId, pass, preDate, finalDate
 * @param {string} [params.portalUrl] - Frontend portal URL
 * @param {string} [params.auditId] - Audit ID
 * @returns {Promise<Object>}
 */
async function sendInterviewScheduledEmail({
  recipientEmail,
  auditorName = 'Auditor',
  auditIdString = 'AUDIT',
  auditPeriod = 'Current Period',
  resources = [],
  portalUrl = process.env.FRONTEND_URL || 'http://localhost:5174',
  auditId
}) {
  let cleanRecipient = recipientEmail;
  if (!cleanRecipient || typeof cleanRecipient !== 'string' || !cleanRecipient.includes('@')) {
    cleanRecipient = 'ww@gmail.com';
  } else {
    cleanRecipient = cleanRecipient.trim();
  }

  const subject = `Audit ${auditIdString}: Statutory Candidate Interview Schedule`;

  const resourcesHtml = resources.map((r, i) => `
    <div style="background: #FFFFFF; border: 1.5px solid #E2E8F0; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
      <div style="font-weight: 800; font-size: 15px; color: #0F172A; margin-bottom: 8px;">
        Candidate #${i + 1}: <span style="color: #1565C0;">${r.name || 'Candidate ' + (i + 1)}</span>
      </div>
      <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
        <tr>
          <td style="padding: 4px 0; color: #64748B; width: 120px;">Pre Date:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #1E293B;">${r.preDate || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Final Date:</td>
          <td style="padding: 4px 0; font-weight: 600; color: #1E293B;">${r.finalDate || 'N/A'}</td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B;">Interview Status:</td>
          <td style="padding: 4px 0;"><span style="background: #EFF6FF; color: #1D4ED8; font-weight: 700; padding: 2px 8px; border-radius: 999px; font-size: 11px;">Initiate</span></td>
        </tr>
        <tr>
          <td style="padding: 8px 0 4px; color: #64748B; font-weight: bold;">Login ID:</td>
          <td style="padding: 8px 0 4px;"><code style="font-family: monospace; font-size: 15px; font-weight: bold; background: #EFF6FF; color: #1D4ED8; padding: 4px 10px; border-radius: 6px; border: 1px solid #BFDBFE;">${r.loginId}</code></td>
        </tr>
        <tr>
          <td style="padding: 4px 0; color: #64748B; font-weight: bold;">Password:</td>
          <td style="padding: 4px 0;"><code style="font-family: monospace; font-size: 15px; font-weight: bold; background: #EFF6FF; color: #1D4ED8; padding: 4px 10px; border-radius: 6px; border: 1px solid #BFDBFE;">${r.pass}</code></td>
        </tr>
      </table>
    </div>
  `).join('');

  const targetAuditParam = auditId || auditIdString || '';
  const firstLoginId = resources.length === 1 && resources[0].loginId
    ? `?loginId=${encodeURIComponent(resources[0].loginId)}${targetAuditParam ? `&auditId=${encodeURIComponent(targetAuditParam)}` : ''}`
    : (targetAuditParam ? `?auditId=${encodeURIComponent(targetAuditParam)}` : '');

  const text = `
Dear ${auditorName},

Your interview audit has been scheduled for audit reference ${auditIdString} (${auditPeriod}).

Below are the candidate interview credentials:
${resources.map((r, i) => `
Candidate #${i + 1}: ${r.name || 'Candidate'}
- Login ID: ${r.loginId}
- Password: ${r.pass}
- Dates: ${r.preDate} to ${r.finalDate}
`).join('\n')}

Access the candidate interview portal:
${portalUrl}/interview-login${firstLoginId}

Best regards,
Compliance Management Platform
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: #F8FAFC; margin: 0; padding: 24px; color: #0F172A; }
    .card { max-width: 620px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 16px rgba(11, 31, 58, 0.05); }
    .header { background: #0B1F3A; color: #FFFFFF; padding: 24px 32px; border-bottom: 3px solid #2563EB; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.01em; }
    .header p { margin: 6px 0 0; color: #94A3B8; font-size: 13px; }
    .body { padding: 28px 32px; }
    .greeting { font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 12px; }
    .lead { font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 20px; }
    .footer { padding: 20px 32px; background: #F1F5F9; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1>Compliance Management Platform</h1>
      <p>Automated Interview Audit Scheduling Notification</p>
    </div>
    <div class="body">
      <div class="greeting">Dear ${auditorName},</div>
      <p class="lead">
        Your interview audit has been scheduled for audit reference <strong>${auditIdString}</strong> (${auditPeriod}). Unique candidate credentials have been generated below:
      </p>

      ${resourcesHtml}

      <div style="text-align: center; margin: 28px 0 16px;">
        <a href="${portalUrl}/interview-login${firstLoginId}" target="_blank" style="display: inline-block; background-color: #2563EB; color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 30px; border-radius: 8px; box-shadow: 0 2px 6px rgba(37, 99, 235, 0.3);">
          Access Candidate Interview Portal &rarr;
        </a>
      </div>
    </div>
    <div class="footer">
      This is an automated notification from the Compliance Platform.<br>
      Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
`.trim();

  return sendEmail({
    to: cleanRecipient,
    subject,
    text,
    html
  });
}

module.exports = {
  sendEmail,
  sendVendorDocumentReminderEmail,
  sendAuditScheduledEmail,
  sendInterviewScheduledEmail
};

