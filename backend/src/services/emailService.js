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
 * @param {string} [options.cc] - Carbon copy recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.text - Plain text version
 * @param {string} options.html - HTML version
 * @returns {Promise<Object>}
 */
async function sendEmail({ to, cc, subject, text, html }) {
  const user = (process.env.SMTP_USER || 'nagpalrahul987@gmail.com').trim();
  const from = process.env.EMAIL_FROM || `"Compliance Platform" <${user}>`;
  const transporter = getTransporter();

  if (transporter) {
    try {
      const mailOptions = {
        from,
        to,
        replyTo: user,
        subject,
        text,
        html,
        headers: {
          'X-Auto-Response-Suppress': 'OOF, AutoReply'
        }
      };
      if (cc) {
        mailOptions.cc = cc;
      }
      const info = await transporter.sendMail(mailOptions);
      console.log(`[Email Service]: Email delivered to ${to}${cc ? ` (CC: ${cc})` : ''} (Message ID: ${info.messageId})`);
      return { success: true, messageId: info.messageId, simulated: false };
    } catch (err) {
      console.error(`[Email Service Error]: Failed to send email via SMTP to ${to}${cc ? ` (CC: ${cc})` : ''}:`, err.message);
      // Fallback to simulated delivery so reminder workflow is never completely blocked
      console.log(`[Email Service Fallback]: Email logged for ${to}${cc ? ` (CC: ${cc})` : ''}: "${subject}"`);
      return { success: false, error: err.message, simulated: true };
    }
  }

  // Simulated delivery for local development when SMTP is not configured
  console.log(`=======================================================`);
  console.log(`[Email Service - Simulated Delivery]:`);
  console.log(`From:    ${from}`);
  console.log(`To:      ${to}`);
  if (cc) console.log(`CC:      ${cc}`);
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
 * @param {string} [params.customerEmail] - Customer's email address for CC
 * @param {string} [params.cc] - Optional CC email address
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
  customerEmail,
  cc,
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

  const ccRecipient = cc || customerEmail || undefined;

  return sendEmail({
    to: vendorEmail,
    cc: ccRecipient,
    subject,
    text,
    html
  });
}

/**
 * Sends a rich email notification to the assigned auditor when an audit is created.
 *
 * @param {Object} params
 * @param {string} params.auditorEmail - Auditor's email address
 * @param {string} [params.auditorName] - Auditor's name
 * @param {string} [params.vendorName] - Vendor's company name
 * @param {string} [params.customerName] - Enterprise Client / Customer name
 * @param {string} params.auditIdString - Audit code e.g. AUD-2026-0009
 * @param {string} params.auditPeriod - Audit period e.g. H1 2026 (Jan-Jun)
 * @param {string} [params.startDate] - Scheduled start date
 * @param {string} [params.dueDate] - Scheduled due date
 * @param {string} [params.establishmentType] - Type of establishment
 * @param {string} [params.state] - State / Location
 * @param {string} [params.portalUrl] - Base URL for the platform
 * @returns {Promise<Object>}
 */
async function sendAuditorAuditAssignedEmail({
  auditorEmail,
  auditorName = 'Auditor',
  vendorName = 'Vendor Partner',
  customerName = 'Enterprise Client',
  auditIdString = 'AUDIT',
  auditPeriod = 'Current Period',
  startDate = 'N/A',
  dueDate = 'N/A',
  establishmentType = '',
  state = '',
  portalUrl = process.env.FRONTEND_URL || 'http://localhost:5174'
}) {
  const subject = `New Compliance Audit Assigned: ${auditIdString} (${vendorName} - ${auditPeriod})`;

  const text = `
Dear ${auditorName},

A new statutory compliance audit has been created and assigned to you on the Compliance Management Platform.

Audit Details:
- Audit Reference ID: ${auditIdString}
- Audit Cycle / Period: ${auditPeriod}
- Enterprise Client:  ${customerName}
- Vendor Organization: ${vendorName}
- Scheduled Start:    ${startDate}
- Compliance Due:     ${dueDate}
${establishmentType ? `- Establishment:       ${establishmentType}\n` : ''}${state && state !== 'N/A' ? `- State/Jurisdiction:  ${state}\n` : ''}
You can log in to your Auditor Portal to track document submissions, conduct candidate interviews, and evaluate statutory compliance.

Access Auditor Portal:
${portalUrl}/auditor

Thank you,
Compliance Management Platform
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Compliance Audit Assigned</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #4338CA 0%, #1E40AF 100%); padding: 28px 32px; color: #FFFFFF; }
    .header-badge { display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    .header p { margin: 0; font-size: 13px; color: #E2E8F0; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #0F172A; }
    .lead { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .info-banner { background: #EEF2FF; border: 1.5px solid #C7D2FE; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px; }
    .info-icon { font-size: 20px; line-height: 1; }
    .info-title { font-size: 13px; font-weight: 700; color: #3730A3; margin: 0 0 2px; }
    .info-desc { font-size: 12.5px; color: #4338CA; margin: 0; line-height: 1.4; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; background: #F8FAFC; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; }
    .details-table th, .details-table td { padding: 10px 16px; font-size: 13px; text-align: left; border-bottom: 1px solid #E2E8F0; }
    .details-table th { width: 38%; color: #64748B; font-weight: 600; background: #F1F5F9; }
    .details-table td { color: #0F172A; font-weight: 700; }
    .btn-container { text-align: center; margin: 32px 0 16px; }
    .btn { display: inline-block; background: #4338CA; color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 32px; border-radius: 8px; box-shadow: 0 3px 8px rgba(67, 56, 202, 0.35); text-align: center; }
    .footer { padding: 20px 32px; background: #F1F5F9; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-badge">Audit Assignment</div>
      <h1>Compliance Management Platform</h1>
      <p>Automated Auditor Notification System</p>
    </div>
    <div class="body">
      <div class="greeting">Dear ${auditorName},</div>
      <p class="lead">
        A new statutory compliance audit has been scheduled and assigned to you. You can review the audit parameters below and monitor vendor document uploads directly in your Auditor Portal.
      </p>

      <div class="info-banner">
        <span class="info-icon">🔍</span>
        <div>
          <div class="info-title">Audit Assignment Details</div>
          <div class="info-desc">
            The vendor has been notified to submit their statutory compliance documents. You will be able to verify documents and calculate compliance once submissions begin.
          </div>
        </div>
      </div>

      <table class="details-table">
        <tr>
          <th>Audit Reference ID</th>
          <td style="color: #4338CA;">${auditIdString}</td>
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
          <th>Vendor Organization</th>
          <td>${vendorName}</td>
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
        <a href="${portalUrl}/auditor" class="btn">Open Auditor Portal &rarr;</a>
      </div>
    </div>
    <div class="footer">
      This is an automated system notification from the Compliance Management Platform.<br>
      Please do not reply directly to this email. For questions, contact the platform administrator.
    </div>
  </div>
</body>
</html>
`.trim();

  return sendEmail({
    to: auditorEmail,
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
  recipientName,
  vendorName,
  auditorName = 'Vendor',
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

  const displayName = recipientName || vendorName || (auditorName !== 'Auditor' ? auditorName : '') || 'Vendor';

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
Dear ${displayName},

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
      <div class="greeting">Dear ${displayName},</div>
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

/**
 * Send email to Auditor when Admin changes the Audit Timeline
 */
async function sendAuditorTimelineUpdatedEmail({
  auditorEmail,
  auditorName = 'Auditor',
  vendorName = 'Vendor Partner',
  customerName = 'Enterprise Client',
  auditIdString = 'AUDIT',
  auditPeriod = 'Current Period',
  startDate = 'N/A',
  dueDate = 'N/A',
  establishmentType = '',
  state = '',
  portalUrl = process.env.FRONTEND_URL || 'http://localhost:5174'
}) {
  const subject = `Notice: Audit Timeline Rescheduled for ${auditIdString} (${vendorName} - ${startDate} to ${dueDate})`;

  const text = `
Dear ${auditorName},

Please be advised that the statutory compliance audit timeline for audit reference ${auditIdString} (${auditPeriod}) has been updated by the Administrator.

Updated Timeline Details:
- Audit Reference ID:  ${auditIdString}
- Audit Cycle / Period: ${auditPeriod}
- Enterprise Client:   ${customerName}
- Vendor Organization: ${vendorName}
- Rescheduled Start:   ${startDate}
- Compliance Due Date: ${dueDate}
${establishmentType ? `- Establishment:        ${establishmentType}\n` : ''}${state && state !== 'N/A' ? `- State/Jurisdiction:   ${state}\n` : ''}
Please review the updated submission schedule in your Auditor Portal:
${portalUrl}/auditor

Thank you,
Compliance Management Platform
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Audit Timeline Rescheduled</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #4338CA 0%, #1E40AF 100%); padding: 28px 32px; color: #FFFFFF; }
    .header-badge { display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    .header p { margin: 0; font-size: 13px; color: #E2E8F0; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #0F172A; }
    .lead { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .alert-banner { background: #EEF2FF; border: 1.5px solid #C7D2FE; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px; }
    .alert-icon { font-size: 20px; line-height: 1; }
    .alert-title { font-size: 13px; font-weight: 700; color: #3730A3; margin: 0 0 2px; }
    .alert-desc { font-size: 12.5px; color: #4338CA; margin: 0; line-height: 1.4; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; background: #F8FAFC; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; }
    .details-table th, .details-table td { padding: 10px 16px; font-size: 13px; text-align: left; border-bottom: 1px solid #E2E8F0; }
    .details-table th { width: 38%; color: #64748B; font-weight: 600; background: #F1F5F9; }
    .details-table td { color: #0F172A; font-weight: 700; }
    .highlight-due { color: #DC2626 !important; font-weight: 800; }
    .btn-container { text-align: center; margin: 32px 0 16px; }
    .btn { display: inline-block; background: #4338CA; color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 32px; border-radius: 8px; box-shadow: 0 3px 8px rgba(67, 56, 202, 0.35); text-align: center; }
    .footer { padding: 20px 32px; background: #F1F5F9; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-badge">Timeline Rescheduled</div>
      <h1>Compliance Management Platform</h1>
      <p>Audit Timeline Rescheduled Notification</p>
    </div>
    <div class="body">
      <div class="greeting">Dear ${auditorName},</div>
      <p class="lead">
        Please note that the Administrator has rescheduled the compliance timeline for audit reference <strong>${auditIdString}</strong> (${auditPeriod}).
      </p>

      <div class="alert-banner">
        <span class="alert-icon">📅</span>
        <div>
          <div class="alert-title">Rescheduled Audit Timeline</div>
          <div class="alert-desc">
            The start date and document submission deadline have been updated. Please conduct your statutory evaluations according to the revised schedule below.
          </div>
        </div>
      </div>

      <table class="details-table">
        <tr>
          <th>Audit Reference ID</th>
          <td style="color: #4338CA;">${auditIdString}</td>
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
          <th>Vendor Organization</th>
          <td>${vendorName}</td>
        </tr>
        <tr>
          <th>New Scheduled Start</th>
          <td>${startDate}</td>
        </tr>
        <tr>
          <th>New Compliance Due</th>
          <td class="highlight-due">${dueDate}</td>
        </tr>
        ${establishmentType ? `<tr><th>Establishment Type</th><td>${establishmentType}</td></tr>` : ''}
        ${state && state !== 'N/A' ? `<tr><th>State / Jurisdiction</th><td>${state}</td></tr>` : ''}
      </table>

      <div class="btn-container">
        <a href="${portalUrl}/auditor" class="btn">Open Auditor Portal &rarr;</a>
      </div>
    </div>
    <div class="footer">
      This is an automated system notification from the Compliance Management Platform.<br>
      Please do not reply directly to this email. For questions, contact the platform administrator.
    </div>
  </div>
</body>
</html>
`.trim();

  return sendEmail({
    to: auditorEmail,
    subject,
    text,
    html
  });
}

/**
 * Send email to Vendor when Admin changes the Audit Timeline
 */
async function sendVendorTimelineUpdatedEmail({
  vendorEmail,
  vendorName = 'Vendor Partner',
  customerName = 'Enterprise Client',
  auditIdString = 'AUDIT',
  auditPeriod = 'Current Period',
  startDate = 'N/A',
  dueDate = 'N/A',
  establishmentType = '',
  state = '',
  portalUrl = process.env.FRONTEND_URL || 'http://localhost:5174'
}) {
  const subject = `Notice: Audit Timeline Rescheduled for ${auditIdString} - New Due Date: ${dueDate}`;

  const text = `
Dear ${vendorName},

Please be advised that the statutory compliance audit timeline for audit reference ${auditIdString} (${auditPeriod}) has been updated by the Administrator.

Updated Timeline Details:
- Audit Reference ID:  ${auditIdString}
- Audit Cycle / Period: ${auditPeriod}
- Enterprise Client:   ${customerName}
- Rescheduled Start:   ${startDate}
- New Due Date:        ${dueDate}
${establishmentType ? `- Establishment:        ${establishmentType}\n` : ''}${state && state !== 'N/A' ? `- State/Jurisdiction:   ${state}\n` : ''}
DOCUMENT SUBMISSION NOTICE:
Please ensure all required statutory compliance evidence is submitted to your document vault by the new due date (${dueDate}).

Access Vendor Portal:
${portalUrl}/vendor/documents

Thank you,
Compliance Management Platform
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Audit Timeline Rescheduled</title>
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
    .alert-banner { background: #F0FDF4; border: 1.5px solid #86EFAC; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px; }
    .alert-icon { font-size: 20px; line-height: 1; }
    .alert-title { font-size: 13px; font-weight: 700; color: #166534; margin: 0 0 2px; }
    .alert-desc { font-size: 12.5px; color: #15803D; margin: 0; line-height: 1.4; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; background: #F8FAFC; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; }
    .details-table th, .details-table td { padding: 10px 16px; font-size: 13px; text-align: left; border-bottom: 1px solid #E2E8F0; }
    .details-table th { width: 38%; color: #64748B; font-weight: 600; background: #F1F5F9; }
    .details-table td { color: #0F172A; font-weight: 700; }
    .highlight-due { color: #DC2626 !important; font-weight: 800; }
    .btn-container { text-align: center; margin: 32px 0 16px; }
    .btn { display: inline-block; background: #0F766E; color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 32px; border-radius: 8px; box-shadow: 0 3px 8px rgba(15, 118, 110, 0.35); text-align: center; }
    .footer { padding: 20px 32px; background: #F1F5F9; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-badge">Submission Deadline Rescheduled</div>
      <h1>Compliance Management Platform</h1>
      <p>Statutory Document Submission Schedule</p>
    </div>
    <div class="body">
      <div class="greeting">Dear ${vendorName},</div>
      <p class="lead">
        The scheduled compliance timeline for audit reference <strong>${auditIdString}</strong> (${auditPeriod}) has been updated. Please take note of the revised statutory document submission due date.
      </p>

      <div class="alert-banner">
        <span class="alert-icon">📌</span>
        <div>
          <div class="alert-title">Revised Document Submission Window</div>
          <div class="alert-desc">
            Please ensure all mandatory registers, returns, and evidence are uploaded to the vault before the new compliance due date.
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
          <th>New Scheduled Start</th>
          <td>${startDate}</td>
        </tr>
        <tr>
          <th>New Compliance Due Date</th>
          <td class="highlight-due">${dueDate}</td>
        </tr>
        ${establishmentType ? `<tr><th>Establishment Type</th><td>${establishmentType}</td></tr>` : ''}
        ${state && state !== 'N/A' ? `<tr><th>State / Jurisdiction</th><td>${state}</td></tr>` : ''}
      </table>

      <div class="btn-container">
        <a href="${portalUrl}/vendor/documents" class="btn">Upload Documents to Vault &rarr;</a>
      </div>
    </div>
    <div class="footer">
      This is an automated system notification from the Compliance Management Platform.<br>
      Please do not reply directly to this email. For questions, contact the platform administrator.
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
 * Sends notification email to assigned auditor when a vendor uploads a compliance document.
 * Informs the auditor that documents are ready and they can now begin the audit.
 * 
 * @param {Object} params
 * @param {string} params.auditorEmail
 * @param {string} [params.auditorName]
 * @param {string} [params.vendorName]
 * @param {string} [params.customerName]
 * @param {string} [params.auditIdString]
 * @param {string} [params.auditPeriod]
 * @param {string} [params.documentName]
 * @param {string} [params.documentType]
 * @param {number} [params.totalDocuments]
 * @param {string} [params.startDate]
 * @param {string} [params.dueDate]
 * @param {string} [params.portalUrl]
 * @returns {Promise<Object>}
 */
async function sendAuditorDocumentUploadedEmail({
  auditorEmail,
  auditorName = 'Auditor',
  vendorName = 'Vendor Partner',
  customerName = 'Enterprise Client',
  auditIdString = 'AUDIT',
  auditPeriod = 'Current Period',
  documentName = 'Document',
  documentType = 'General',
  totalDocuments = 1,
  startDate = 'N/A',
  dueDate = 'N/A',
  portalUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
}) {
  const subject = `Document Uploaded: ${vendorName} has uploaded documents for ${auditIdString} - Audit Ready to Begin`;

  const text = `
Dear ${auditorName},

Please be informed that ${vendorName} has uploaded a new compliance document for statutory audit ${auditIdString} (${auditPeriod}).

The audit documents are now available for your review, and you can now proceed to log in to the Auditor Portal and start the audit evaluation.

Upload & Audit Details:
- Audit Reference ID:    ${auditIdString}
- Audit Cycle / Period:  ${auditPeriod}
- Vendor Organization:   ${vendorName}
- Enterprise Client:     ${customerName}
- Document Uploaded:     ${documentName}
- Document Category:     ${documentType}
- Total Documents:       ${totalDocuments}
- Scheduled Audit Dates: ${startDate} - ${dueDate}

Access Auditor Portal to start the audit:
${portalUrl}/auditor

Thank you,
Compliance Management Platform
`.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Vendor Document Uploaded - Ready to Start Audit</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F8FAFC; color: #1E293B; margin: 0; padding: 24px; }
    .card { max-width: 600px; margin: 0 auto; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #059669 0%, #047857 100%); padding: 28px 32px; color: #FFFFFF; }
    .header-badge { display: inline-block; background: rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; }
    .header h1 { margin: 0 0 6px; font-size: 22px; font-weight: 700; letter-spacing: -0.01em; }
    .header p { margin: 0; font-size: 13px; color: #D1FAE5; }
    .body { padding: 32px; }
    .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; color: #0F172A; }
    .lead { font-size: 14px; line-height: 1.6; color: #475569; margin-bottom: 24px; }
    .action-banner { background: #ECFDF5; border: 1.5px solid #A7F3D0; border-radius: 8px; padding: 14px 18px; margin-bottom: 24px; display: flex; align-items: flex-start; gap: 12px; }
    .action-icon { font-size: 22px; line-height: 1; }
    .action-title { font-size: 13.5px; font-weight: 700; color: #065F46; margin: 0 0 3px; }
    .action-desc { font-size: 12.5px; color: #047857; margin: 0; line-height: 1.45; }
    .details-table { width: 100%; border-collapse: collapse; margin-bottom: 28px; background: #F8FAFC; border-radius: 8px; overflow: hidden; border: 1px solid #E2E8F0; }
    .details-table th, .details-table td { padding: 10px 16px; font-size: 13px; text-align: left; border-bottom: 1px solid #E2E8F0; }
    .details-table th { width: 40%; color: #64748B; font-weight: 600; background: #F1F5F9; }
    .details-table td { color: #0F172A; font-weight: 700; }
    .badge-doc { display: inline-block; background: #E0F2FE; color: #0369A1; font-weight: 700; padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .btn-container { text-align: center; margin: 32px 0 16px; }
    .btn { display: inline-block; background: #059669; color: #FFFFFF !important; font-size: 14px; font-weight: 700; text-decoration: none; padding: 12px 32px; border-radius: 8px; box-shadow: 0 3px 8px rgba(5, 150, 105, 0.35); text-align: center; }
    .footer { padding: 20px 32px; background: #F1F5F9; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="header-badge">Document Uploaded</div>
      <h1>Compliance Management Platform</h1>
      <p>Vendor Document Available &mdash; Ready for Audit</p>
    </div>

    <div class="body">
      <div class="greeting">Dear ${auditorName},</div>
      <p class="lead">
        <strong>${vendorName}</strong> has uploaded compliance documents for audit reference <strong>${auditIdString}</strong> (${auditPeriod}). You can now begin your audit evaluation.
      </p>

      <div class="action-banner">
        <div class="action-icon">📂</div>
        <div>
          <div class="action-title">Audit Ready to Start</div>
          <div class="action-desc">
            The required vendor compliance documents are uploaded and ready for review in your Auditor Portal.
          </div>
        </div>
      </div>

      <table class="details-table">
        <tr>
          <th>Audit Reference ID</th>
          <td>${auditIdString}</td>
        </tr>
        <tr>
          <th>Audit Period / Cycle</th>
          <td>${auditPeriod}</td>
        </tr>
        <tr>
          <th>Vendor Organization</th>
          <td>${vendorName}</td>
        </tr>
        <tr>
          <th>Enterprise Client</th>
          <td>${customerName}</td>
        </tr>
        <tr>
          <th>Document Uploaded</th>
          <td><span class="badge-doc">${documentName}</span></td>
        </tr>
        <tr>
          <th>Category / Type</th>
          <td>${documentType}</td>
        </tr>
        <tr>
          <th>Total Documents Uploaded</th>
          <td>${totalDocuments} Document(s)</td>
        </tr>
        <tr>
          <th>Scheduled Timeline</th>
          <td>${startDate} &mdash; ${dueDate}</td>
        </tr>
      </table>

      <div class="btn-container">
        <a href="${portalUrl}/auditor" class="btn" target="_blank">
          Open Auditor Portal & Start Audit
        </a>
      </div>
    </div>

    <div class="footer">
      This is an automated notification from the Compliance Management Platform.<br>
      Please do not reply directly to this email.
    </div>
  </div>
</body>
</html>
`.trim();

  return sendEmail({
    to: auditorEmail,
    subject,
    text,
    html
  });
}

module.exports = {
  sendEmail,
  sendVendorDocumentReminderEmail,
  sendAuditScheduledEmail,
  sendAuditorAuditAssignedEmail,
  sendAuditorTimelineUpdatedEmail,
  sendVendorTimelineUpdatedEmail,
  sendInterviewScheduledEmail,
  sendAuditorDocumentUploadedEmail
};
