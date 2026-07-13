/**
 * Seed timestamps, anchored to the day the app is opened.
 *
 * The seeded orders used to carry fixed dates in February 2569. Once the console
 * started deriving its KPIs from real orders, "this month" was always empty and
 * the dashboard read as broken — so it opened on the last month with data
 * instead, which is not what an owner expects to see.
 *
 * Anchoring the newest seeded order to today keeps the current month populated,
 * the month-on-month delta meaningful, and the demo alive next year.
 */
const DAY = 86_400_000;

const startOfToday = (): number => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

/** Fixed for the lifetime of the process, so every seed row shares one "now". */
export const SEED_TODAY = startOfToday();

let clampSeq = 0;

/**
 * `daysAgo(3, 16, 40)` → 16:40 on the day three days before today.
 *
 * A row written for later today (16:40, opened at 09:00) would be stamped in the
 * future, which is nonsense for an order that has already shipped. Those clamp to
 * just-now, each a second apart so the newest-first sort stays strict.
 */
export function daysAgo(n: number, hh = 0, mm = 0): number {
  const d = new Date(SEED_TODAY - n * DAY);
  d.setHours(hh, mm, 0, 0);
  const t = d.getTime();
  const ceiling = Date.now() - 60_000;
  return t <= ceiling ? t : ceiling - clampSeq++ * 1000;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** "ORD-20260710-04012" — the date part must match the row's own timestamp. */
export function seedOrderId(epoch: number, tail: string): string {
  const d = new Date(epoch);
  return `ORD-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${tail}`;
}
