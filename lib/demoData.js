/**
 * Fictional sample leads used for product demos / screen recordings.
 * Every record is invented: names, 555-prefixed phone numbers (reserved for
 * fictional use) and domains are not real businesses. Each is flagged
 * `isDemo: true`, which makes the campaign runner SIMULATE sending instead of
 * dispatching real email.
 */

const RAW = [
  ['Barton Creek Family Dental', 'barton-creek-family-dental.com', 'Their same-day crown technology means patients skip the second visit entirely.', 4.9, 214],
  ['Zilker Smile Studio', 'zilkersmilestudio.com', 'Love that you offer Saturday appointments for families in the Zilker area.', 4.8, 187],
  ['Mueller Modern Dentistry', 'muellermoderndental.com', 'Your digital-first approach to impressions really stands out in East Austin.', 4.9, 342],
  ['Hyde Park Dental Care', 'hydeparkdentalcare.com', 'Being a neighborhood fixture in Hyde Park for over 20 years is impressive.', 4.7, 156],
  ['Westlake Cosmetic Dentistry', 'westlakecosmeticdds.com', 'Your smile-makeover gallery genuinely shows off the artistry involved.', 5.0, 298],
  ['Cedar Park Smiles', 'cedarparksmiles.com', 'Offering free consults for Invisalign is a great way to lower the barrier.', 4.8, 203],
  ['Round Rock Dental Group', 'roundrockdentalgroup.com', 'Having six specialists under one roof makes referrals so much simpler.', 4.6, 421],
  ['The Domain Dental Loft', 'domaindentalloft.com', 'A dental practice with a lounge aesthetic is a genuinely fresh take.', 4.9, 176],
  ['South Congress Dental', 'socodental.com', 'Your walk-in emergency slots are a real asset for the SoCo crowd.', 4.7, 265],
  ['Tarrytown Dental Arts', 'tarrytowndentalarts.com', 'The focus on minimally invasive restorative work really comes through.', 4.8, 142],
  ['Circle C Family Dentistry', 'circlecfamilydds.com', 'Treating three generations of the same families says a lot about trust.', 4.9, 311],
  ['Lakeway Dental Wellness', 'lakewaydentalwellness.com', 'Framing oral care as whole-body wellness is a smart differentiator.', 4.8, 189],
  ['Pflugerville Bright Dental', 'pflugervillebright.com', 'Your bilingual staff clearly makes care more accessible in Pflugerville.', 4.6, 234],
  ['Bee Cave Dental Spa', 'beecavedentalspa.com', 'Noise-cancelling headphones and weighted blankets for anxious patients — brilliant.', 5.0, 167],
  ['Steiner Ranch Orthodontics', 'steinerranchortho.com', 'The before-and-after timelines on your site are genuinely compelling.', 4.9, 208],
  ['Allandale Dental Studio', 'allandaledentalstudio.com', 'Transparent flat-rate pricing is refreshingly rare in dentistry.', 4.7, 129],
  ['Brentwood Smile Co.', 'brentwoodsmileco.com', 'Your in-house membership plan is a clever answer to insurance headaches.', 4.8, 254],
  ['Clarksville Dental Partners', 'clarksvilledentalpartners.com', 'Preserving that historic Clarksville building while modernizing inside is lovely.', 4.9, 173],
  ['East Austin Dental Collective', 'eastaustindental.com', 'A sliding-scale program for local artists is a genuinely community-minded move.', 4.8, 296],
  ['Manor Road Dentistry', 'manorroaddentistry.com', 'Same-week emergency availability is a big deal for working patients.', 4.6, 148],
  ['Georgetown Gentle Dental', 'georgetowngentledental.com', 'Your sedation options make you a real destination for nervous patients.', 4.9, 327],
  ['Buda Family Dental', 'budafamilydental.com', 'Extended evening hours clearly serve the commuter families in Buda well.', 4.7, 195],
  ['Kyle Premier Dentistry', 'kylepremierdentistry.com', 'Investing in 3D cone-beam imaging shows real commitment to diagnostics.', 4.8, 212],
  ['Leander Smile Center', 'leandersmilecenter.com', 'Your kids-first waiting area is a smart touch for a growing suburb.', 4.7, 178],
  ['Wells Branch Dental', 'wellsbranchdental.com', 'Offering teledentistry follow-ups is genuinely ahead of the curve.', 4.6, 163],
  ['Onion Creek Dental Health', 'onioncreekdentalhealth.com', 'The preventive-care focus in your patient education content is excellent.', 4.8, 221],
  ['Travis Heights Dentistry', 'travisheightsdentistry.com', 'Your team clearly takes pride in that neighborhood-practice feel.', 4.9, 184],
  ['Rollingwood Dental Design', 'rollingwooddentaldesign.com', 'The custom veneer work showcased on your site is genuinely impressive.', 5.0, 139],
  ['Spicewood Springs Dental', 'spicewoodspringsdental.com', 'Same-day crowns plus on-site lab is a strong combination.', 4.7, 246],
  ['Anderson Mill Dental Care', 'andersonmilldentalcare.com', 'Twenty-plus years serving Anderson Mill families speaks for itself.', 4.8, 201],
];

const AREAS = [
  'Barton Creek', 'Zilker', 'Mueller', 'Hyde Park', 'Westlake', 'Cedar Park',
  'Round Rock', 'The Domain', 'South Congress', 'Tarrytown', 'Circle C', 'Lakeway',
  'Pflugerville', 'Bee Cave', 'Steiner Ranch', 'Allandale', 'Brentwood', 'Clarksville',
  'East Austin', 'Manor', 'Georgetown', 'Buda', 'Kyle', 'Leander', 'Wells Branch',
  'Onion Creek', 'Travis Heights', 'Rollingwood', 'Spicewood', 'Anderson Mill',
];

const INBOXES = ['info', 'frontdesk', 'hello', 'contact', 'office', 'smile'];

export function getDemoLeads() {
  return RAW.map(([name, domain, line, rating, reviews], i) => ({
    source: 'Google Maps',
    name,
    company: name,
    category: name.includes('Ortho') ? 'Orthodontist' : 'Dentist',
    email: `${INBOXES[i % INBOXES.length]}@${domain}`,
    phone: `(512) 555-${String(1000 + i * 37).slice(0, 4)}`,
    website: `https://www.${domain}`,
    address: `${1200 + i * 63} ${AREAS[i % AREAS.length]} Blvd, Austin, TX ${78701 + (i % 40)}`,
    city: 'Austin',
    state: 'Texas',
    country: 'US',
    title: '',
    linkedin: '',
    rating,
    reviews,
    mapsUrl: '',
    personalizedLine: line,
    isDemo: true,
  }));
}
