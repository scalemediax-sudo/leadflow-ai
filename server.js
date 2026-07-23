import 'dotenv/config';
import express from 'express';
import { ApifyClient } from 'apify-client';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { personalizeLeads } from './lib/personalize.js';
import { mailerConfigured } from './lib/mailer.js';
import { isValidEmail } from './lib/email.js';
import { startCampaign, stopCampaign, getStatus, previewEmail } from './lib/campaign.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const PORT = process.env.PORT || 3000;
const APIFY_TOKEN = process.env.APIFY_TOKEN;
const GOOGLE_MAPS_ACTOR = process.env.GOOGLE_MAPS_ACTOR || 'compass/crawler-google-places';
const APOLLO_ACTOR = process.env.APOLLO_ACTOR || 'code_crafter/apollo-io-scraper';

const app = express();
app.use(express.json({ limit: '2mb' }));
// Never cache the dashboard HTML — a stale page silently runs old JS.
app.use(
  express.static(path.join(__dirname, 'public'), {
    setHeaders(res, filePath) {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
    },
  })
);

/**
 * Convert "user/actor-name" into the "user~actor-name" form the Apify API expects.
 */
function actorId(slug) {
  return slug.replace('/', '~');
}

/**
 * Normalize one Google Maps place record into our common lead shape.
 */
function normalizeGoogleMaps(item) {
  return {
    source: 'Google Maps',
    name: item.title || '',
    company: item.title || '',
    category: item.categoryName || (item.categories ? item.categories.join(', ') : ''),
    email: (item.emails && item.emails[0]) || item.email || '',
    phone: item.phone || item.phoneUnformatted || '',
    website: item.website || '',
    address: item.address || '',
    city: item.city || '',
    state: item.state || '',
    country: item.countryCode || '',
    title: '',
    linkedin: '',
    rating: item.totalScore ?? '',
    reviews: item.reviewsCount ?? '',
    mapsUrl: item.url || '',
  };
}

/**
 * Normalize one Apollo person record into our common lead shape.
 * Apollo actors vary a bit in field names, so we probe several.
 */
function normalizeApollo(item) {
  const org = item.organization || item.account || {};
  return {
    source: 'Apollo',
    name: item.name || [item.first_name, item.last_name].filter(Boolean).join(' '),
    company: item.organization_name || org.name || item.account_name || '',
    category: org.industry || item.industry || '',
    email: item.email || item.personal_email || '',
    phone: item.phone || item.sanitized_phone || (org.phone || ''),
    website: org.website_url || item.website_url || '',
    address: [item.city, item.state, item.country].filter(Boolean).join(', '),
    city: item.city || '',
    state: item.state || '',
    country: item.country || '',
    title: item.title || item.headline || '',
    linkedin: item.linkedin_url || item.linkedin || '',
    rating: '',
    reviews: '',
    mapsUrl: '',
  };
}

/**
 * Run one Apify actor and return its dataset items.
 */
async function runActor(client, slug, input) {
  const run = await client.actor(actorId(slug)).call(input);
  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  return items;
}

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    hasToken: Boolean(APIFY_TOKEN),
    hasGroq: Boolean(process.env.GROQ_API_KEY),
    hasGmail: mailerConfigured(),
  });
});

app.post('/api/scrape', async (req, res) => {
  if (!APIFY_TOKEN) {
    return res.status(400).json({
      error: 'No Apify token configured. Add APIFY_TOKEN to your .env file and restart the server.',
    });
  }

  const {
    keyword = '',
    location = '',
    sources = ['google_maps'],
    maxResults = 50,
    apolloUrl = '',
  } = req.body || {};

  const limit = Math.max(1, Math.min(Number(maxResults) || 50, 1000));
  const client = new ApifyClient({ token: APIFY_TOKEN });

  const wantGoogle = sources.includes('google_maps');
  const wantApollo = sources.includes('apollo');

  if (wantGoogle && !keyword.trim()) {
    return res.status(400).json({ error: 'A keyword is required for Google Maps.' });
  }
  if (wantApollo && !apolloUrl.trim()) {
    return res.status(400).json({
      error: 'Apollo needs a search URL. Open apollo.io, build your people search (filters + location), and paste the browser URL into the Apollo field.',
    });
  }

  const tasks = [];
  const warnings = [];

  if (wantGoogle) {
    const gmInput = {
      searchStringsArray: [keyword.trim()],
      locationQuery: location.trim() || undefined,
      maxCrawledPlacesPerSearch: limit,
      language: 'en',
      skipClosedPlaces: false,
      scrapeContacts: true,
    };
    tasks.push(
      runActor(client, GOOGLE_MAPS_ACTOR, gmInput)
        .then((items) => items.map(normalizeGoogleMaps))
        .catch((err) => {
          warnings.push(`Google Maps failed: ${err.message}`);
          return [];
        })
    );
  }

  if (wantApollo) {
    const apolloInput = {
      url: apolloUrl.trim(),
      totalRecords: limit,
      getPersonalEmails: true,
      getWorkEmails: true,
    };
    tasks.push(
      runActor(client, APOLLO_ACTOR, apolloInput)
        .then((items) => items.map(normalizeApollo))
        .catch((err) => {
          warnings.push(`Apollo failed: ${err.message}`);
          return [];
        })
    );
  }

  try {
    const results = await Promise.all(tasks);
    const allLeads = results.flat();

    // Only keep leads that have a usable email address.
    const leads = allLeads.filter((l) => isValidEmail(l.email));
    const dropped = allLeads.length - leads.length;
    if (dropped > 0) {
      warnings.push(`${dropped} lead(s) had no email and were skipped.`);
    }

    res.json({ count: leads.length, leads, warnings });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Campaign defaults captured by `npm run setup` ---
app.get('/api/campaign/defaults', (req, res) => {
  const file = path.join(__dirname, 'data', 'campaign.json');
  if (!fs.existsSync(file)) return res.json({});
  try {
    res.json(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    res.json({});
  }
});

// --- Personalization: visit each lead's website and draft a custom opening line ---
app.post('/api/personalize', async (req, res) => {
  const { leads = [] } = req.body || {};
  if (!Array.isArray(leads) || !leads.length) {
    return res.status(400).json({ error: 'No leads to personalize.' });
  }
  try {
    const personalized = await personalizeLeads(leads);
    res.json({ leads: personalized });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// --- Email campaign: send throttled cold emails from your Gmail ---
app.post('/api/campaign/preview', (req, res) => {
  const { lead, subject = '', body = '' } = req.body || {};
  if (!lead) return res.status(400).json({ error: 'No lead to preview.' });
  res.json(previewEmail({ lead, subject, body }));
});

app.post('/api/campaign/start', (req, res) => {
  const { leads = [], subject = '', body = '', fromName = '' } = req.body || {};
  if (!mailerConfigured()) {
    return res.status(400).json({
      error: 'Gmail is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD to your .env and restart.',
    });
  }
  if (!subject.trim() || !body.trim()) {
    return res.status(400).json({ error: 'Subject and body are both required.' });
  }
  try {
    const status = startCampaign({ leads, subject, body, fromName });
    res.json(status);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/campaign/status', (req, res) => res.json(getStatus()));
app.post('/api/campaign/stop', (req, res) => res.json(stopCampaign()));

app.listen(PORT, () => {
  console.log(`\n  Lead Scraper Dashboard running:  http://localhost:${PORT}\n`);
  if (!APIFY_TOKEN) {
    console.log('  ⚠  No APIFY_TOKEN found. Copy .env.example to .env and add your token.\n');
  }
});
