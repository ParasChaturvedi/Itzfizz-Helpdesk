const sgMail = require('@sendgrid/mail');
const nodemailer = require('nodemailer');

let sgReady = false;
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  sgReady = true;
}

let smtpTransport = null;
function getSmtp() {
  if (smtpTransport) return smtpTransport;
  if (!process.env.SMTP_HOST) return null;
  smtpTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  return smtpTransport;
}

const FROM = process.env.EMAIL_FROM || 'Itzfizz Helpdesk Support <no-reply@itzfizz.local>';

// Parse `"Name <email@x.com>"` → { name, email }
function parseFrom(raw = '') {
  const m = raw.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/);
  if (m) return { name: m[1].trim(), email: m[2].trim() };
  return { name: '', email: raw.trim() };
}

// Brevo (Sendinblue) transactional API — free 300 emails/day.
async function sendViaBrevo({ to, subject, html, text, replyTo }) {
  const sender = parseFrom(FROM);
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'content-type': 'application/json',
      accept: 'application/json',
    },
    body: JSON.stringify({
      sender: { email: sender.email, name: sender.name || undefined },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text || stripHtml(html),
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Brevo ${res.status}: ${body.slice(0, 200)}`);
  }
}

/**
 * Send an email. Provider preference: Brevo → SendGrid → SMTP → console log.
 * Never throws, so the ticket flow is never blocked by email problems.
 */
async function sendEmail({ to, subject, html, text, replyTo }) {
  const payload = { to, from: FROM, subject, html, text: text || stripHtml(html) };
  if (replyTo) payload.replyTo = replyTo;

  try {
    if (process.env.BREVO_API_KEY) {
      await sendViaBrevo({ to, subject, html, text, replyTo });
      return { ok: true, provider: 'brevo' };
    }
    if (sgReady) {
      await sgMail.send(payload);
      return { ok: true, provider: 'sendgrid' };
    }
    const smtp = getSmtp();
    if (smtp) {
      await smtp.sendMail({ ...payload, from: FROM });
      return { ok: true, provider: 'smtp' };
    }
    console.log(`[email:noop] To: ${to} | ${subject}`);
    return { ok: false, provider: 'none' };
  } catch (err) {
    console.error('[email] send failed:', err.message);
    return { ok: false, provider: 'error', error: err.message };
  }
}

function stripHtml(html = '') {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

// ── Templates ──────────────────────────────────────────────
const appUrl = () => process.env.APP_URL || 'http://localhost:5173';

function shell(title, body) {
  return `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:560px;margin:auto;color:#1e293b">
    <div style="padding:24px 0;border-bottom:2px solid #6366f1">
      <span style="font-size:20px;font-weight:700;color:#4f46e5">Itzfizz Helpdesk</span>
    </div>
    <div style="padding:24px 0">
      <h2 style="margin:0 0 12px;font-size:18px">${title}</h2>
      ${body}
    </div>
    <div style="padding:16px 0;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8">
      This is an automated message from Itzfizz Helpdesk.
    </div>
  </div>`;
}

function ticketCreatedEmail(ticket) {
  return {
    subject: `[${ticket.reference}] We received your request: ${ticket.subject}`,
    html: shell(
      'Your ticket has been created',
      `<p>Hi ${ticket.requesterName || 'there'},</p>
       <p>Thanks for reaching out. Your request has been logged and our team will get back to you shortly.</p>
       <p><strong>Ticket:</strong> ${ticket.reference}<br/>
          <strong>Subject:</strong> ${ticket.subject}<br/>
          <strong>Status:</strong> ${ticket.status}</p>
       <p style="margin-top:16px">
         <a href="${appUrl()}/tickets/${ticket._id}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View ticket</a>
       </p>`
    ),
  };
}

function ticketReplyEmail(ticket, message) {
  return {
    subject: `[${ticket.reference}] ${ticket.subject}`,
    html: shell(
      'New reply on your ticket',
      `<p>Hi ${ticket.requesterName || 'there'},</p>
       <p>You have a new reply on ticket <strong>${ticket.reference}</strong>:</p>
       <blockquote style="border-left:3px solid #6366f1;margin:12px 0;padding:8px 14px;background:#f8fafc;border-radius:6px">
         ${(message.body || '').replace(/\n/g, '<br/>')}
       </blockquote>
       <p style="margin-top:16px">
         <a href="${appUrl()}/tickets/${ticket._id}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reply</a>
       </p>`
    ),
  };
}

function ticketStatusEmail(ticket) {
  const extra = ticket.estimatedTime
    ? `<p><strong>Estimated time:</strong> ${ticket.estimatedTime}</p>`
    : '';
  return {
    subject: `[${ticket.reference}] Status updated: ${ticket.status}`,
    html: shell(
      'Your ticket status changed',
      `<p>Hi ${ticket.requesterName || 'there'},</p>
       <p>The status of ticket <strong>${ticket.reference}</strong> is now
          <strong>${ticket.status.replace('_', ' ')}</strong>.</p>
       ${extra}
       <p style="margin-top:16px">
         <a href="${appUrl()}/tickets/${ticket._id}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">View ticket</a>
       </p>`
    ),
  };
}

function ticketAssignedEmail(ticket, agent) {
  return {
    subject: `[${ticket.reference}] You've been assigned: ${ticket.subject}`,
    html: shell(
      'A ticket was assigned to you',
      `<p>Hi ${agent.name || 'there'},</p>
       <p>You have been assigned ticket <strong>${ticket.reference}</strong>.</p>
       <p><strong>Subject:</strong> ${ticket.subject}<br/>
          <strong>Priority:</strong> ${ticket.priority}<br/>
          <strong>Department:</strong> ${ticket.department}</p>
       <p style="margin-top:16px">
         <a href="${appUrl()}/tickets/${ticket._id}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Open ticket</a>
       </p>`
    ),
  };
}

module.exports = {
  sendEmail,
  ticketCreatedEmail,
  ticketReplyEmail,
  ticketStatusEmail,
  ticketAssignedEmail,
};
