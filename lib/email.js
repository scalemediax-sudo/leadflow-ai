/**
 * Contact scrapers occasionally return junk that merely contains an "@" —
 * map URLs with coordinates (`.../@30.38,-97.71`), tracking fragments, etc.
 * A plain `includes('@')` check lets those through and they fail at send time,
 * so validate the shape properly instead.
 */
const EMAIL_RE = /^[^\s@<>()[\],;:\\"]+@[^\s@<>()[\],;:\\"]+\.[A-Za-z]{2,}$/;

export function isValidEmail(value) {
  if (typeof value !== 'string') return false;
  const v = value.trim();
  if (!v || v.length > 254) return false;
  if (v.includes('/') || v.includes('?')) return false; // URL, not an address
  return EMAIL_RE.test(v);
}
