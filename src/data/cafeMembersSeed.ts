/**
 * Mock café members — the people behind สมาชิก / แต้มสะสม.
 *
 * With an empty store both screens read as broken (no rows, ฿0 overview), so
 * these cover the states the counter actually meets: a card that is full and
 * waiting to be claimed, cards halfway there, a brand-new member on zero, and
 * one regular whose points already expired from not coming back.
 *
 * Points are derived from the transactions, never typed twice — a member whose
 * balance disagreed with their own history would be a bug on display.
 */
import type { CafeMember, CafePointTxn } from "../store/cafeMembers";
import { SEED_TODAY } from "./seedClock";

const DAY = 86_400_000;

/** One member plus the visits behind their balance, newest gap first. */
type Spec = {
  id: string;
  phone: string;
  name: string;
  /** Days ago for each visit that earned a point, newest first. */
  earnedDaysAgo: number[];
  /** Days ago for each free cup claimed. */
  redeemedDaysAgo?: number[];
};

const SPECS: Spec[] = [
  // The demo account itself, so the customer side of the stamp card is not
  // empty on a fresh install (phone matches session.DEMO_USER).
  { id: "mem-seed-me", name: "ณัฐพงษ์", phone: "0614213111", earnedDaysAgo: [2, 5, 9, 14, 22, 30] },
  // Card full — walks in today and gets a free cup.
  { id: "mem-seed-1", name: "มิ้นท์", phone: "0812345678", earnedDaysAgo: [1, 3, 5, 8, 12, 15, 19, 23, 27, 31] },
  // Two thirds of the way there — the most common state on a real card.
  { id: "mem-seed-2", name: "ก้อง", phone: "0898765432", earnedDaysAgo: [2, 6, 9, 14, 20, 26, 33] },
  // Has claimed once already, and is building the next card.
  // Ten visits filled the first card, claimed a week ago, two visits since.
  { id: "mem-seed-3", name: "แนน", phone: "0863331122", earnedDaysAgo: [3, 5, 9, 12, 15, 18, 21, 25, 28, 32, 36, 40], redeemedDaysAgo: [7] },
  { id: "mem-seed-4", name: "พี่เอ๋ ร้านข้างบ้าน", phone: "0917778899", earnedDaysAgo: [3, 10, 16] },
  { id: "mem-seed-5", name: "ต้นน้ำ", phone: "0955554321", earnedDaysAgo: [6, 21] },
  // Joined at the counter today, nothing on the card yet.
  { id: "mem-seed-6", name: "ฟ้า", phone: "0801112233", earnedDaysAgo: [] },
  // Regular who stopped coming — 13 months of silence, so the card is stale and
  // usablePoints() reads 0 even though the raw number is 6.
  { id: "mem-seed-7", name: "โอ๊ต", phone: "0844445555", earnedDaysAgo: [400, 404, 409, 415, 421, 428] },
];

const at = (daysAgo: number, hour: number) => SEED_TODAY - daysAgo * DAY + hour * 3_600_000;

const built = (() => {
  const members: CafeMember[] = [];
  const txns: CafePointTxn[] = [];

  for (const s of SPECS) {
    const earns = s.earnedDaysAgo.map((d, i) => ({ d, at: at(d, 9 + (i % 8)) }));
    const redeems = (s.redeemedDaysAgo ?? []).map((d, i) => ({ d, at: at(d, 10 + i) }));

    for (const [i, e] of earns.entries()) {
      txns.push({ id: `txn-seed-${s.id}-e${i}`, memberId: s.id, delta: 1, reason: "earn", orderId: `POS-${e.at}`, at: e.at });
    }
    for (const [i, r] of redeems.entries()) {
      txns.push({ id: `txn-seed-${s.id}-r${i}`, memberId: s.id, delta: -10, reason: "redeem", orderId: `POS-${r.at}`, at: r.at });
    }

    const points = txns.filter((t) => t.memberId === s.id).reduce((n, t) => n + t.delta, 0);
    const lastVisit = [...earns, ...redeems].reduce((m, x) => Math.max(m, x.at), 0);

    members.push({
      id: s.id,
      phone: s.phone,
      name: s.name,
      points: Math.max(0, points),
      // A member with no visits yet joined today at the counter.
      joinedAt: earns.length > 0 ? at(Math.max(...s.earnedDaysAgo), 8) : SEED_TODAY,
      lastVisitAt: lastVisit || SEED_TODAY,
    });
  }

  // Newest first, matching how every other feed in the app is ordered.
  txns.sort((a, b) => b.at - a.at);
  return { members, txns };
})();

export const CAFE_MEMBERS_SEED = built.members;
export const CAFE_POINT_TXNS_SEED = built.txns;
