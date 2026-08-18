import "server-only";
import { prisma } from "./prisma";
import { startOfWeek } from "./time";

// ─────────────────────────────────────────────────────────────────────────────
// "This week's income" — which client payments actually land in the current
// week (Mon–Sun), and how much.
//
// Rules (per spec):
//  · WEEKLY   → every Friday. First pay prorated by weekdays worked / 5.
//  · BIWEEKLY → Friday of the 2nd week after start, then every 2 weeks. First
//               pay prorated by weekdays worked / 10.
//  · MONTHLY  → on the client's payDayOfMonth (clamped to month length). First
//               pay prorated by (days left in the start month) / days in month.
//  · Weekly & biweekly always fall on a Friday; biweekly is anchored to the
//    client's start date.
//
// Per-payment amount:
//  · HOURLY → rate × hours/week, ×1 (weekly), ×2 (biweekly), ×(daysInMonth/7)
//    (monthly, ≈ weeks in the month).
//  · FIXED  → the retainer `rate` is the amount per pay period (paid as-is).
// ─────────────────────────────────────────────────────────────────────────────

const DAY = 86_400_000;

function dateOnly(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate();
}

// First Friday on or after `d` (date-only).
function firstFridayOnOrAfter(d: Date): Date {
  const x = dateOnly(d);
  x.setDate(x.getDate() + ((5 - x.getDay() + 7) % 7)); // Friday = 5
  return x;
}

// Count Mon–Fri days between a and b inclusive (date-only).
function weekdaysBetween(a: Date, b: Date): number {
  let count = 0;
  for (let t = dateOnly(a).getTime(); t <= dateOnly(b).getTime(); t += DAY) {
    const day = new Date(t).getDay();
    if (day >= 1 && day <= 5) count++;
  }
  return count;
}

type IncomeClient = {
  payFrequency: string | null;
  payDayOfMonth: number | null;
  startDate: Date | null;
  billingRates: { type: string; rate: unknown; hoursPerWeek: unknown }[];
};

function perPaymentAmount(
  freq: string,
  billingType: string,
  rate: number | null,
  hoursPerWeek: number | null,
  monthDays: number,
): number | null {
  if (billingType === "FIXED") return rate != null ? rate : null; // retainer per period
  // HOURLY
  if (rate == null || hoursPerWeek == null) return null;
  const weekly = rate * hoursPerWeek;
  if (freq === "WEEKLY") return weekly;
  if (freq === "BIWEEKLY") return weekly * 2;
  if (freq === "MONTHLY") return weekly * (monthDays / 7);
  return null;
}

export type WeekPayment = {
  amount: number;
  prorated: boolean;
  when: Date; // the pay date
};

// The single payment (if any) a client makes during the week starting `weekStart`.
export function paymentInWeek(
  client: IncomeClient,
  weekStart: Date,
): WeekPayment | null {
  const freq = client.payFrequency;
  const b = client.billingRates[0];
  if (!freq || !b) return null;

  const rate = b.rate != null ? Number(b.rate) : null;
  const hours = b.hoursPerWeek != null ? Number(b.hoursPerWeek) : null;
  const billingType = b.type;
  const start = client.startDate ? dateOnly(new Date(client.startDate)) : null;

  const friday = new Date(weekStart);
  friday.setDate(weekStart.getDate() + 4);

  if (freq === "WEEKLY") {
    const firstPay = start ? firstFridayOnOrAfter(start) : null;
    if (firstPay && friday < firstPay) return null; // not started paying yet
    let amount = perPaymentAmount(
      "WEEKLY",
      billingType,
      rate,
      hours,
      daysInMonth(friday.getFullYear(), friday.getMonth()),
    );
    if (amount == null) return null;
    let prorated = false;
    if (start && firstPay && friday.getTime() === firstPay.getTime()) {
      const f = weekdaysBetween(start, friday) / 5;
      if (f < 1) {
        amount *= f;
        prorated = true;
      }
    }
    return { amount, prorated, when: friday };
  }

  if (freq === "BIWEEKLY") {
    if (!start) return null; // biweekly needs a start date to anchor the cadence
    const firstPay = new Date(firstFridayOnOrAfter(start).getTime() + 7 * DAY);
    if (friday < firstPay) return null;
    const diffDays = Math.round((friday.getTime() - firstPay.getTime()) / DAY);
    if (diffDays % 14 !== 0) return null; // not a pay Friday
    let amount = perPaymentAmount(
      "BIWEEKLY",
      billingType,
      rate,
      hours,
      daysInMonth(friday.getFullYear(), friday.getMonth()),
    );
    if (amount == null) return null;
    let prorated = false;
    if (diffDays === 0) {
      const f = weekdaysBetween(start, friday) / 10;
      if (f < 1) {
        amount *= f;
        prorated = true;
      }
    }
    return { amount, prorated, when: friday };
  }

  if (freq === "MONTHLY") {
    const payDom = client.payDayOfMonth;
    if (!payDom) return null;
    // Find the day in this week (if any) that is the monthly pay date.
    let payday: Date | null = null;
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      if (d.getDate() === Math.min(payDom, daysInMonth(d.getFullYear(), d.getMonth()))) {
        payday = d;
        break;
      }
    }
    if (!payday) return null;

    let firstPay: Date | null = null;
    if (start) {
      const inStartMonth = Math.min(payDom, daysInMonth(start.getFullYear(), start.getMonth()));
      let cand = new Date(start.getFullYear(), start.getMonth(), inStartMonth);
      if (cand < start) {
        const y = start.getMonth() === 11 ? start.getFullYear() + 1 : start.getFullYear();
        const m = (start.getMonth() + 1) % 12;
        cand = new Date(y, m, Math.min(payDom, daysInMonth(y, m)));
      }
      firstPay = cand;
      if (payday < firstPay) return null;
    }

    let amount = perPaymentAmount(
      "MONTHLY",
      billingType,
      rate,
      hours,
      daysInMonth(payday.getFullYear(), payday.getMonth()),
    );
    if (amount == null) return null;
    let prorated = false;
    if (start && firstPay && payday.getTime() === firstPay.getTime()) {
      const sMonthDays = daysInMonth(start.getFullYear(), start.getMonth());
      const f = (sMonthDays - start.getDate() + 1) / sMonthDays;
      if (f < 1) {
        amount *= f;
        prorated = true;
      }
    }
    return { amount, prorated, when: payday };
  }

  return null;
}

export type IncomeRow = {
  id: string;
  companyName: string;
  colorHex: string | null;
  amount: number;
  prorated: boolean;
  when: Date;
  frequency: string | null;
};

// Payments landing in the current week (Mon–Sun), per active client + total.
export async function getThisWeekIncome(): Promise<{
  rows: IncomeRow[];
  total: number;
  weekStart: Date;
  weekEnd: Date;
}> {
  const weekStart = startOfWeek(new Date());
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const clients = await prisma.client.findMany({
    where: { status: "ACTIVE" },
    orderBy: { companyName: "asc" },
    select: {
      id: true,
      companyName: true,
      colorHex: true,
      payFrequency: true,
      payDayOfMonth: true,
      startDate: true,
      billingRates: {
        orderBy: { effectiveFrom: "desc" },
        take: 1,
        select: { type: true, rate: true, hoursPerWeek: true },
      },
    },
  });

  const rows: IncomeRow[] = [];
  for (const c of clients) {
    const pay = paymentInWeek(c, weekStart);
    if (pay && pay.amount > 0) {
      rows.push({
        id: c.id,
        companyName: c.companyName,
        colorHex: c.colorHex,
        amount: pay.amount,
        prorated: pay.prorated,
        when: pay.when,
        frequency: c.payFrequency,
      });
    }
  }
  rows.sort((a, b) => a.when.getTime() - b.when.getTime());
  const total = rows.reduce((s, r) => s + r.amount, 0);
  return { rows, total, weekStart, weekEnd };
}
