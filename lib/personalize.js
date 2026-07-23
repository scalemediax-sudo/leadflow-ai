const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

/**
 * Fetch a website's homepage and return cleaned, truncated visible text.
 * Returns '' if the site can't be reached.
 */
async function fetchWebsiteText(url) {
  if (!url) return '';
  const target = url.startsWith('http') ? url : `https://${url}`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);
    const res = await fetch(target, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LeadBot/1.0)' },
      redirect: 'follow',
    });
    clearTimeout(timeout);
    if (!res.ok) return '';
    const html = await res.text();
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&[a-z]+;/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 6000);
  } catch {
    return '';
  }
}

/**
 * Generate a single personalized opening line for one lead using Groq.
 * Uses the website text if available, otherwise falls back to the lead's
 * title/company/category (useful for Apollo leads with no scraped site).
 */
async function generateLine(apiKey, lead, websiteText) {
  const facts = [
    lead.company && `Business: ${lead.company}`,
    lead.title && `Contact role: ${lead.title}`,
    lead.category && `Industry/category: ${lead.category}`,
    lead.city && `Location: ${[lead.city, lead.state].filter(Boolean).join(', ')}`,
    websiteText && `Website content:\n${websiteText}`,
  ]
    .filter(Boolean)
    .join('\n');

  const system =
    'You write the opening line of a cold outreach email. Given information about a business, ' +
    'write ONE sentence (max 25 words) that references something specific and genuine about them ' +
    'to open warmly — a compliment, an observation, or a point of connection. ' +
    'Rules: sound like a real person, not a marketer. No "I hope this finds you well". ' +
    'No greeting and no sign-off — just the sentence. If you truly have nothing specific to say, ' +
    'write a natural, non-generic line about their industry. Output ONLY the sentence, nothing else.';

  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 120,
      temperature: 0.7,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: facts },
      ],
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Groq API ${res.status}: ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || '';
  return text.trim().replace(/^["']|["']$/g, '');
}

/**
 * Personalize a list of leads. Adds `personalizedLine` to each.
 * Runs with limited concurrency to stay within API rate limits.
 */
export async function personalizeLeads(leads, { concurrency = 4 } = {}) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error('No GROQ_API_KEY configured. Add it to your .env file and restart.');
  }

  const queue = [...leads.keys()];
  const out = [...leads];

  async function worker() {
    while (queue.length) {
      const i = queue.shift();
      const lead = out[i];
      try {
        const siteText = await fetchWebsiteText(lead.website);
        out[i] = { ...lead, personalizedLine: await generateLine(apiKey, lead, siteText) };
      } catch (err) {
        out[i] = { ...lead, personalizedLine: '', personalizeError: err.message };
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, leads.length) }, worker));
  return out;
}
