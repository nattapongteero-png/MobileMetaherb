/**
 * Journey tests — one customer's trip across MANY stores at once.
 *
 * Every store has its own suite, but real flows cross tables: a coupon touches
 * the wallet, the order, the analytics and the shop's console in one purchase.
 * These tests walk the full trips and assert the cross-store consistency no
 * single-store test can see.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { splitByShop } from "../src/data/checkoutSplit";
import {
  __resetOrders, createOrder, markDelivered, markPaid, ordersForShop, ordersForUser,
  seedOrders, shipOrder, submitOrderReview, verifyPayment,
} from "../src/store/orders";
import { __resetStock, seedStock, stockOf } from "../src/store/stock";
import { __resetEvents, eventsFor, unreadCount } from "../src/store/events";
import {
  __resetCoupons, addCoupon, canApply, collectCoupon, couponById, couponDiscount,
  redeemCoupon, seedCoupons, type Coupon,
} from "../src/store/coupons";
import { customerStats, monthlyLineRevenue, topProducts, totals } from "../src/store/analytics";
import { __resetTrials, applyForTrial, approveRegistration, shipTrial, submitEval, EMPTY_ANSWERS } from "../src/store/trials";
import { getRegistrationsForTrial } from "../src/data/ownerTrialRegistrations";
import { __resetCafe, cafeQueue, completeCafeOrder, markCafeReady, placeCafeOrder, queueAheadOf } from "../src/store/cafe";
import { hydrateAll, setPersistence } from "../src/store/db";
import { rehydrateImages } from "../src/store/orders";

const BUYER = "u-1";
const SHOP = "METAHERB Store";
const RECIPIENT = { name: "ณัฐพงษ์ ธีโรภาส", phone: "061-421-3111", address: "กรุงเทพฯ" };

beforeEach(() => {
  __resetOrders();
  __resetStock();
  __resetEvents();
  __resetCoupons();
  __resetTrials();
  __resetCafe();
});

// ── 1. the full shopping trip ──────────────────────────────────
describe("journey: coupon → checkout → shop fulfils → dashboard moves", () => {
  const NOW = new Date(2026, 6, 10, 10, 0).getTime();

  const coupon: Coupon = {
    id: "cp1", code: "MH30", name: "ลด ฿30", discountType: "baht", discountValue: 30,
    minOrder: 100, perUserLimit: 1,
    startsAt: new Date(NOW - 86400000).toISOString(), endsAt: new Date(NOW + 86400000).toISOString(),
    used: 0, status: "active", shopName: SHOP,
  };

  it("keeps every table consistent through the whole trip", () => {
    seedStock({ "1": 20 });
    seedCoupons([coupon]);

    // Collect the coupon, exactly as CouponCollectScreen does.
    collectCoupon(BUYER, "cp1");
    const lines = [{ productId: "1", name: "น้ำผึ้งมะนาว", option: "", quantity: 2, price: 199 }];
    const subtotal = 398;
    expect(canApply(couponById("cp1")!, { userId: BUYER, subtotal, shops: [SHOP], now: NOW })).toBe(true);
    const discount = couponDiscount(couponById("cp1")!, subtotal);
    expect(discount).toBe(30);

    // Checkout: order carries the discounted total; the coupon is spent.
    const res = createOrder({
      userId: BUYER, shopName: SHOP, items: lines, recipient: RECIPIENT,
      total: subtotal - discount, now: NOW,
    });
    expect(res.ok).toBe(true);
    const orderId = res.ok ? res.order.id : "";
    redeemCoupon(BUYER, "cp1");

    // Cross-store consistency, immediately after paying:
    expect(stockOf("1")).toBe(18); // stock down
    expect(couponById("cp1")!.used).toBe(1); // coupon counted
    expect(canApply(couponById("cp1")!, { userId: BUYER, subtotal, shops: [SHOP], now: NOW })).toBe(false); // per-user limit
    expect(unreadCount("shop", { shopName: SHOP })).toBe(1); // the shop was told
    expect(ordersForShop(SHOP)[0].total).toBe(368); // and sees the discounted total

    // The shop fulfils; the buyer confirms and reviews.
    markPaid(orderId);
    verifyPayment(orderId);
    shipOrder(orderId, "TH-J1");
    markDelivered(orderId);
    submitOrderReview(orderId, { rating: 5, comment: "ดีมาก" });

    // The buyer heard about each step that concerns them.
    const buyerEvents = eventsFor("customer", { userId: BUYER }).map((e) => e.type);
    expect(buyerEvents).toEqual(expect.arrayContaining(["order_verified", "order_shipped", "order_delivered"]));

    // …and the dashboard actually moved: revenue, series, best-seller, customer.
    const shopOrders = ordersForShop(SHOP);
    const t = totals(shopOrders);
    expect(t.sales).toBe(368);
    expect(t.settled).toBe(368); // completed = payable
    expect(monthlyLineRevenue(shopOrders, 2026)[6]).toBe(398); // goods-only series
    expect(topProducts(shopOrders, 1)[0]).toMatchObject({ productId: "1", units: 2 });
    expect(customerStats(shopOrders)[0]).toMatchObject({ userId: BUYER, orders: 1, total: 368 });
  });
});

// ── 2. one basket, two shops ───────────────────────────────────
describe("journey: a mixed basket becomes one order per shop, to the satang", () => {
  it("splits the grand total proportionally and each shop sees only its own", () => {
    seedStock({});
    const items = [
      { shop: SHOP, productId: "1", name: "a", option: "", quantity: 1, price: 300 },
      { shop: "บ้านสมุนไพรไทย", productId: "37", name: "b", option: "", quantity: 1, price: 100 },
    ];
    const subtotal = 400;
    const grand = 450; // + shipping 50

    const shares = splitByShop(items, grand, subtotal);
    expect(shares.map((s) => s.share).reduce((a, b) => a + b, 0)).toBe(grand);

    for (const { shopName, lines, share } of shares) {
      const res = createOrder({ userId: BUYER, shopName, items: lines, recipient: RECIPIENT, total: share });
      expect(res.ok).toBe(true);
    }
    expect(ordersForShop(SHOP)).toHaveLength(1);
    expect(ordersForShop("บ้านสมุนไพรไทย")).toHaveLength(1);
    expect(ordersForShop(SHOP)[0].total).toBe(338); // 300/400 × 450, rounded
    expect(ordersForShop("บ้านสมุนไพรไทย")[0].total).toBe(112); // absorbs the remainder
    expect(ordersForUser(BUYER)).toHaveLength(2);
  });

  it("never produces a negative share — the defect extraction uncovered", () => {
    // Four equal shops, grand total crushed to ฿2 by a deep coupon: the old
    // inline code rounded 0.5 up three times and handed the last shop −1.
    const items = ["A", "B", "C", "D"].map((shop) => ({ shop, price: 1, quantity: 1 }));
    const shares = splitByShop(items, 2, 4);
    expect(shares.map((s) => s.share).reduce((a, b) => a + b, 0)).toBe(2);
    for (const s of shares) expect(s.share, s.shopName).toBeGreaterThanOrEqual(0);
  });

  it("property: 2,000 random baskets — shares always sum exactly, never negative", () => {
    let a = 12345;
    const rnd = () => {
      a = (a * 1103515245 + 12345) % 2147483648;
      return a / 2147483648;
    };
    for (let i = 0; i < 2000; i++) {
      const shopCount = 1 + Math.floor(rnd() * 5);
      const items = Array.from({ length: 1 + Math.floor(rnd() * 6) }, () => ({
        shop: `S${Math.floor(rnd() * shopCount)}`,
        price: 1 + Math.floor(rnd() * 500),
        quantity: 1 + Math.floor(rnd() * 4),
      }));
      const subtotal = items.reduce((s, it) => s + it.price * it.quantity, 0);
      // Grand from a deep-coupon floor up to subtotal + heavy shipping.
      const grand = Math.floor(rnd() * (subtotal + 200));
      const shares = splitByShop(items, grand, subtotal);
      const sum = shares.reduce((s, x) => s + x.share, 0);
      expect(sum, `i=${i}`).toBe(Math.max(0, grand));
      for (const s of shares) expect(s.share, `i=${i} ${s.shopName}`).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── 3. the app restarts ────────────────────────────────────────
describe("journey: same-day restart keeps what the customer did", () => {
  it("an order placed before the restart is still there after hydration", async () => {
    // A fake disk stands in for AsyncStorage; the stores persist through it.
    const disk = new Map<string, string>();
    setPersistence({
      getItem: async (k) => disk.get(k) ?? null,
      setItem: async (k, v) => void disk.set(k, v),
      removeItem: async (k) => void disk.delete(k),
    });

    seedOrders([]);
    seedStock({ "1": 20 });
    const res = createOrder({
      userId: BUYER, shopName: SHOP, recipient: RECIPIENT,
      items: [{ productId: "1", name: "น้ำผึ้งมะนาว", option: "", quantity: 3, price: 100, image: 42 }],
    });
    expect(res.ok).toBe(true);
    const orderId = res.ok ? res.order.id : "";

    // Persistence is debounced (~120 ms) — let it flush, like a real session would.
    await new Promise((r) => setTimeout(r, 250));

    // "Restart": fresh seeds wipe the in-memory state, then hydration restores.
    seedOrders([]);
    seedStock({ "1": 20 });
    expect(ordersForUser(BUYER)).toHaveLength(0);
    await hydrateAll();

    const restored = ordersForUser(BUYER);
    expect(restored.map((o) => o.id)).toEqual([orderId]);
    expect(stockOf("1")).toBe(17); // the decrement survived too

    // Images are dropped for the disk (bundler ints don't survive a rebuild)
    // and resolved back from productId on boot.
    expect(restored[0].items[0].image).toBeUndefined();
    rehydrateImages(() => 99);
    expect(ordersForUser(BUYER)[0].items[0].image).toBe(99);
  });
});

// ── 4. a trial application, seen from the owner's side ─────────
describe("journey: trial applicant becomes a real row in the owner's registry", () => {
  it("walks apply → approve → ship → evaluate, and the owner reads the real answers", () => {
    const reg = applyForTrial({
      trialId: "trial-1", userId: BUYER, shopName: SHOP,
      applicantName: RECIPIENT.name, applicantPhone: RECIPIENT.phone, address: RECIPIENT.address,
      reason: "อยากลองก่อนซื้อจริงครับ", objectives: ["efficacy"],
    });
    approveRegistration(reg.id);
    shipTrial(reg.id, "TH-TRIAL-J");
    submitEval(reg.id, "post", {
      ...EMPTY_ANSWERS,
      scoreById: { core_overall: 4 },
      npsScores: { core_nps: 9 },
      textAnswers: { core_text: "ใช้ดีครับ" },
    });

    // The owner's registry lists the REAL applicant first, ahead of the demo cohort…
    const rows = getRegistrationsForTrial("trial-1");
    const mine = rows[0];
    expect(mine.name).toBe(RECIPIENT.name);
    expect(mine.id).toBe(reg.id);

    // …with the survey answers mapped through, not synthesised.
    expect(mine.evaluation).toMatchObject({ overall: 4, comment: "ใช้ดีครับ", wouldRecommend: true });
    expect(mine.evaluation!.scoreById).toEqual({ core_overall: 4 });
    // And the demo cohort still exists BEHIND the real row.
    expect(rows.length).toBeGreaterThan(1);
  });
});

// ── 5. the café queue breathes ─────────────────────────────────
describe("journey: the queue position a customer is promised reflects the real queue", () => {
  const order = (orderId: string, queueNo: number) => ({
    orderId, userId: BUYER, shopName: SHOP,
    payLabel: "เงินสด", receiveLabel: "รับที่ร้าน",
    items: [{ name: "ลาเต้", qty: 1, summary: "", total: 75 }],
    total: 75, queueNo, queueAhead: 0, waitMinutes: 5, readyAt: Date.now() + 300000,
  });

  it("shortens everyone's wait when the barista hands one over", () => {
    placeCafeOrder(order("C1", 10));
    placeCafeOrder(order("C2", 11));
    expect(queueAheadOf(SHOP, 12)).toBe(2); // a third customer would wait behind two

    markCafeReady("C1");
    completeCafeOrder("C1");
    expect(queueAheadOf(SHOP, 12)).toBe(1); // and one fewer after a hand-over

    expect(cafeQueue(SHOP).map((o) => o.orderId)).toEqual(["C2"]);
  });
});
