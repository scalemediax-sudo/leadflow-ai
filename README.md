# LeadFlow AI — Cold Email Agent

Find local businesses, let AI write a genuinely personalized opening line for each one, then send them a throttled cold-email drip from your own Gmail — all from one local dashboard.

```
 Scrape  ──▶  Personalize  ──▶  Send
 Google Maps   AI reads their     Your Gmail,
 + Apollo      website & writes   one email every
 (email only)  a custom line      3–4 minutes
```

---

## Quick start

```bash
git clone https://github.com/<your-username>/leadflow-ai.git
cd leadflow-ai
npm install
npm run setup     # interactive — asks for your keys and email template
npm start
```

Then open **http://localhost:3000**

`npm run setup` walks you through everything and writes your `.env`. Re-run it anytime to change your details.

---

## What you'll need

All three have free tiers.

| | What for | Where to get it |
|---|---|---|
| **Apify token** | Scraping Google Maps / Apollo | [console.apify.com](https://console.apify.com/settings/integrations) |
| **Groq API key** | Writing the personalized lines | [console.groq.com/keys](https://console.groq.com/keys) |
| **Gmail App Password** | Sending the emails | [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords) |

> The Gmail App Password is a 16-character code — **not** your normal password. You need 2-Step Verification enabled on your Google account before the option appears.

---

## How to use it

1. **Find leads** — enter a keyword (`dental clinic`, `med spa`, `plumber`) and a location. Only businesses with a reachable email address are kept.
2. **Personalize with AI** — the agent visits each lead's website and writes one specific, genuine opening line per business.
3. **Compose** — write your email once using placeholders; each send is filled in per lead.
4. **Send** — one email every 3–4 minutes, with live progress in the Activity view.

Export to CSV at any point.

### Placeholders

| Placeholder | Becomes |
|---|---|
| `{{first_name}}` | First word of the contact/business name |
| `{{name}}` | Full contact or business name |
| `{{company}}` | Business name |
| `{{title}}` | Job title (Apollo leads) |
| `{{city}}` | City |
| `{{personalized_line}}` | The AI-written line for that lead |

An unsubscribe line is appended to every email automatically.

---

## Configuration

Everything lives in `.env` (created by `npm run setup`).

| Variable | Default | Notes |
|---|---|---|
| `MIN_GAP_SECONDS` / `MAX_GAP_SECONDS` | `180` / `240` | Delay between emails. Keep it generous. |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | Any Groq-hosted model |
| `GOOGLE_MAPS_ACTOR` | `compass/crawler-google-places` | Swap in any Apify actor |
| `APOLLO_ACTOR` | `code_crafter/apollo-io-scraper` | Apollo needs a search URL |
| `DEMO_MODE` | `false` | Uses a bundled sample dataset instead of live API calls — useful for demos |
| `SMTP_TLS_INSECURE` | `false` | Set `true` only if antivirus/proxy breaks the SMTP TLS handshake |

---

## Sending responsibly

Cold email has rules, and your sender reputation is hard to win back.

- **Start small.** A fresh Gmail account should stay well under ~50/day and ramp slowly.
- **Keep the delay.** The 3–4 minute gap exists to avoid tripping spam heuristics.
- **Honour opt-outs immediately.** Every email includes an unsubscribe line — respect it.
- **Target businesses, not individuals**, and make sure your offer is actually relevant to them.
- Check the rules that apply to you — [CAN-SPAM](https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business) (US), GDPR (EU), CASL (Canada).

For higher volume, move to a dedicated cold-email platform on a separate domain rather than pushing Gmail harder.

---

## Project layout

```
server.js            Express API + static host
setup.js             Interactive onboarding wizard
lib/personalize.js   Website scrape + Groq line generation
lib/mailer.js        Gmail SMTP transport
lib/campaign.js      Throttled send queue + template rendering
lib/demoData.js      Fictional sample leads for demo mode
public/index.html    The dashboard (single file, no build step)
```

No build step, no framework, no database — clone and run.

---

## Notes

- Apify runs consume credits on your account; bigger searches cost more.
- Google Maps returns an email only when a business publishes one, so expect fewer emailable leads than raw results.
- Apollo requires a search URL: build your People search on apollo.io, then paste the browser URL into the dashboard.
- Campaign state is in-memory — restarting the server clears an in-progress run.

## License

MIT
