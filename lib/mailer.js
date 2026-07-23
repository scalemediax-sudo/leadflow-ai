import nodemailer from 'nodemailer';

let transporter = null;

/**
 * Build (once) a Gmail SMTP transporter from env credentials.
 */
export function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error(
      'Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in your .env file. ' +
        '(The password must be a Google App Password, not your normal login password.)'
    );
  }
  // Some machines run antivirus/proxy software that intercepts the SMTP TLS
  // connection with its own certificate, which breaks strict chain validation.
  // SMTP_TLS_INSECURE=true skips that check for the mail socket only.
  const insecureTls = String(process.env.SMTP_TLS_INSECURE).toLowerCase() === 'true';
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
    ...(insecureTls ? { tls: { rejectUnauthorized: false } } : {}),
  });
  return transporter;
}

export function mailerConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/**
 * Send one email. `text` is plain text; an HTML version is derived from it.
 */
export async function sendEmail({ to, subject, text, fromName }) {
  const t = getTransporter();
  const from = fromName
    ? `"${fromName}" <${process.env.GMAIL_USER}>`
    : process.env.GMAIL_USER;
  const html = text
    .split('\n')
    .map((line) => (line.trim() ? `<p style="margin:0 0 12px">${escapeHtml(line)}</p>` : '<br>'))
    .join('');
  return t.sendMail({ from, to, subject, text, html });
}

function escapeHtml(s) {
  return s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}
