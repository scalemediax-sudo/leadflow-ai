import { sendEmail } from './mailer.js';

const MIN_GAP = (Number(process.env.MIN_GAP_SECONDS) || 180) * 1000; // 3 min
const MAX_GAP = (Number(process.env.MAX_GAP_SECONDS) || 240) * 1000; // 4 min

/**
 * In-memory campaign state. One active campaign at a time (single sender inbox).
 */
let state = null;
let timer = null;

function randomGap() {
  return Math.floor(MIN_GAP + Math.random() * Math.max(0, MAX_GAP - MIN_GAP));
}

/**
 * Fill {{placeholders}} in a template from a lead.
 */
function render(template, lead) {
  const firstName = (lead.name || lead.company || '').trim().split(/\s+/)[0] || 'there';
  const map = {
    first_name: firstName,
    name: lead.name || lead.company || '',
    company: lead.company || '',
    title: lead.title || '',
    city: lead.city || '',
    personalized_line: lead.personalizedLine || '',
  };
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => (key in map ? map[key] : ''));
}

const UNSUBSCRIBE =
  "\n\n---\nIf you'd rather not hear from me, just reply \"unsubscribe\" and I'll remove you right away.";

/**
 * Start a campaign. Emails are sent one at a time with a random 3-4 min gap.
 * Returns immediately; sending continues in the background.
 */
export function startCampaign({ leads, subject, body, fromName }) {
  if (state && state.status === 'running') {
    throw new Error('A campaign is already running. Stop it before starting a new one.');
  }

  const recipients = leads
    .filter((l) => l.email && l.email.includes('@'))
    .map((l) => ({
      email: l.email,
      name: l.name || l.company || '',
      subject: render(subject, l),
      body: render(body, l) + UNSUBSCRIBE,
      status: 'pending',
      error: null,
      sentAt: null,
    }));

  if (!recipients.length) throw new Error('No leads with valid email addresses to send to.');

  // Demo leads are fictional — simulate the send so a live demo shows the full
  // flow without dispatching real email to made-up domains.
  const simulate = leads.some((l) => l.isDemo);

  state = {
    status: 'running',
    simulate,
    fromName,
    total: recipients.length,
    sent: 0,
    failed: 0,
    currentIndex: 0,
    nextSendAt: Date.now(),
    startedAt: Date.now(),
    recipients,
  };

  sendNext();
  return getStatus();
}

async function sendNext() {
  if (!state || state.status !== 'running') return;

  const idx = state.currentIndex;
  if (idx >= state.recipients.length) {
    state.status = 'completed';
    state.nextSendAt = null;
    return;
  }

  const r = state.recipients[idx];
  try {
    if (state.simulate) {
      r.simulated = true; // demo lead — nothing actually leaves the machine
    } else {
      await sendEmail({ to: r.email, subject: r.subject, text: r.body, fromName: state.fromName });
    }
    r.status = 'sent';
    r.sentAt = Date.now();
    state.sent += 1;
  } catch (err) {
    r.status = 'failed';
    r.error = err.message;
    state.failed += 1;
  }

  state.currentIndex += 1;

  if (state.currentIndex >= state.recipients.length) {
    state.status = 'completed';
    state.nextSendAt = null;
    return;
  }

  // Demo runs move fast so an audience sees progress; real sends stay throttled.
  const gap = state.simulate ? 2500 : randomGap();
  state.nextSendAt = Date.now() + gap;
  timer = setTimeout(sendNext, gap);
}

export function stopCampaign() {
  if (timer) clearTimeout(timer);
  timer = null;
  if (state && state.status === 'running') {
    state.status = 'stopped';
    state.nextSendAt = null;
  }
  return getStatus();
}

export function getStatus() {
  if (!state) return { status: 'idle' };
  return {
    status: state.status,
    simulate: Boolean(state.simulate),
    total: state.total,
    sent: state.sent,
    failed: state.failed,
    pending: state.total - state.sent - state.failed,
    nextSendAt: state.nextSendAt,
    fromName: state.fromName,
    recipients: state.recipients.map((r) => ({
      email: r.email,
      name: r.name,
      status: r.status,
      error: r.error,
      sentAt: r.sentAt,
    })),
  };
}

/** Render a single preview email for the first lead (for the UI). */
export function previewEmail({ lead, subject, body }) {
  return {
    subject: render(subject, lead),
    body: render(body, lead) + UNSUBSCRIBE,
  };
}
