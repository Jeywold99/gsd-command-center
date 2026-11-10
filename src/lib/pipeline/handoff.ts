// Helpers for turning a hired application into a Command Center client + project. Pure functions, no secrets.

export const CURRENCIES = ["USD", "PHP", "EUR", "GBP", "AUD", "CAD"] as const;

// Guess the billing currency from the rate text the job post gave ("$8/hr", "₱250/hr", "EUR 20 per hour").
export function inferCurrency(rate: string | null | undefined): (typeof CURRENCIES)[number] {
  const r = rate ?? "";
  if (/₱|\bPHP\b|\bpesos?\b/i.test(r)) return "PHP";
  if (/€|\bEUR\b/i.test(r)) return "EUR";
  if (/£|\bGBP\b/i.test(r)) return "GBP";
  if (/\bAUD\b|\bA\$/i.test(r)) return "AUD";
  if (/\bCAD\b|\bC\$/i.test(r)) return "CAD";
  return "USD";
}

// A single, clear hourly rate such as "$8/hr", "$8.50 per hour", "USD 8/hour". A range ("$6 to $8/hr") or
// anything vague returns null: the person types the agreed rate themselves.
export function parseHourlyRate(rate: string | null | undefined): number | null {
  const r = (rate ?? "").trim();
  if (!r) return null;
  if (/\d\s*(?:-|–|—|to)\s*[$₱€£]?\s*\d/i.test(r)) return null; // a range
  const m = /(?:[$₱€£]|\b(?:USD|PHP|EUR|GBP|AUD|CAD)\b)\s*(\d+(?:\.\d{1,2})?)\s*(?:\/|per\s+|an?\s+)\s*(?:hr|hour)\b/i.exec(r);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 && n < 10_000 ? n : null;
}
