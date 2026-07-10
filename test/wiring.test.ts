/**
 * Guard against the failure the store unit tests are blind to: a domain action
 * that works perfectly and that no screen ever calls.
 *
 * Every one of these was a real dead end — approve a trial and the tester waited
 * forever because nothing shipped the sample; the shop could price a quote that
 * the buyer had no button to answer.
 *
 * This reads source text rather than rendering, so it is a smoke alarm, not a
 * proof: it can tell you a reference exists, not that the button is reachable.
 * It resolves aliased imports (`setShopName as setSessionShopName`) and ignores
 * comments, because the first draft of this file was fooled by both.
 */
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, "../src");

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) sourceFiles(full, acc);
    else if (/\.tsx?$/.test(entry.name) && !entry.name.endsWith(".test.ts")) acc.push(full);
  }
  return acc;
}

const FILES = sourceFiles(SRC);

const stripComments = (src: string): string =>
  src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const IMPORT_BLOCK = /import\s*\{([^}]*)\}\s*from\s*['"][^'"]*['"]/g;

/** The name `fn` is bound to in this file — its alias, or itself. Null if not imported. */
function localName(src: string, fn: string): string | null {
  for (const [, names] of src.matchAll(IMPORT_BLOCK)) {
    for (const raw of names.split(",")) {
      const [orig, alias] = raw.trim().replace(/^type\s+/, "").split(/\s+as\s+/);
      if (orig === fn) return alias ?? orig;
    }
  }
  return null;
}

/** Files that reference the action — the module defining it doesn't count. */
function callSites(fn: string, definedIn: string): string[] {
  return FILES.filter((f) => {
    if (f.endsWith(definedIn)) return false;
    const src = readFileSync(f, "utf8");
    const local = localName(src, fn);
    if (!local) return false;
    // Look past the imports: a file that imports and never uses proves nothing.
    const body = stripComments(src).replace(IMPORT_BLOCK, "");
    return new RegExp(`\\b${local}\\b`).test(body);
  }).map((f) => path.relative(SRC, f));
}

const ACTIONS: { fn: string; definedIn: string; why: string }[] = [
  { fn: "createOrder", definedIn: "store/orders.ts", why: "checkout must create an order" },
  { fn: "markPaid", definedIn: "store/orders.ts", why: "paying must move the order to รอตรวจสอบ" },
  { fn: "verifyPayment", definedIn: "store/orders.ts", why: "the shop must be able to confirm payment" },
  { fn: "shipOrder", definedIn: "store/orders.ts", why: "the shop must be able to ship" },
  { fn: "requestCancellation", definedIn: "store/orders.ts", why: "the buyer must be able to ask to cancel" },
  { fn: "decideCancellation", definedIn: "store/orders.ts", why: "the shop must answer a cancellation request" },
  { fn: "submitOrderReview", definedIn: "store/orders.ts", why: "the buyer must be able to review" },

  { fn: "addProduct", definedIn: "store/catalog.ts", why: "the owner must be able to add a product" },
  { fn: "deleteProduct", definedIn: "store/catalog.ts", why: "the owner must be able to delete one" },
  { fn: "setProductClosed", definedIn: "store/catalog.ts", why: "the owner must be able to hide one" },

  { fn: "collectCoupon", definedIn: "store/coupons.ts", why: "the buyer must be able to collect a coupon" },
  { fn: "redeemCoupon", definedIn: "store/coupons.ts", why: "checkout must spend the coupon" },
  { fn: "addCoupon", definedIn: "store/coupons.ts", why: "the shop must be able to create one" },

  { fn: "upsertFlash", definedIn: "store/promotions.ts", why: "the owner must be able to join a flash round" },
  { fn: "removeFlash", definedIn: "store/promotions.ts", why: "pulling a product from flash must restore its price" },
  { fn: "togglePromotion", definedIn: "store/promotions.ts", why: "the owner must be able to switch a promo off" },

  { fn: "fileComplaint", definedIn: "store/complaints.ts", why: "the buyer must be able to file" },
  { fn: "decideComplaint", definedIn: "store/complaints.ts", why: "the shop must be able to decide" },

  { fn: "applyForTrial", definedIn: "store/trials.ts", why: "applying must persist" },
  { fn: "approveRegistration", definedIn: "store/trials.ts", why: "the shop must be able to approve" },
  { fn: "rejectRegistration", definedIn: "store/trials.ts", why: "the shop must be able to reject" },
  { fn: "shipTrial", definedIn: "store/trials.ts", why: "the shop must be able to send the sample" },
  { fn: "submitEval", definedIn: "store/trials.ts", why: "the tester must be able to submit answers" },

  { fn: "createQuoteRequest", definedIn: "store/quotes.ts", why: "submitting an RFQ must persist" },
  { fn: "sendQuote", definedIn: "store/quotes.ts", why: "the shop must be able to price it" },
  { fn: "acceptQuote", definedIn: "store/quotes.ts", why: "the buyer must be able to accept" },
  { fn: "rejectQuote", definedIn: "store/quotes.ts", why: "the buyer must be able to reject" },

  { fn: "placeCafeOrder", definedIn: "store/cafe.ts", why: "café checkout must queue the order" },
  { fn: "markCafeReady", definedIn: "store/cafe.ts", why: "the barista must be able to mark it ready" },
  { fn: "completeCafeOrder", definedIn: "store/cafe.ts", why: "the barista must be able to hand it over" },
  { fn: "rateCafeOrder", definedIn: "store/cafe.ts", why: "the buyer must be able to review" },

  { fn: "sendMessage", definedIn: "store/chat.ts", why: "both sides must be able to send" },
  { fn: "markThreadRead", definedIn: "store/chat.ts", why: "opening a thread must clear its badge" },
  { fn: "openThread", definedIn: "store/chat.ts", why: "chatting a shop for the first time must open a thread" },

  { fn: "signIn", definedIn: "store/session.ts", why: "login must produce a session" },
  { fn: "signUp", definedIn: "store/session.ts", why: "register must produce a session" },
  { fn: "setShopName", definedIn: "store/session.ts", why: "seller registration must name the shop" },

  { fn: "markEventRead", definedIn: "store/events.ts", why: "notifications must be markable read" },
];

describe("every domain action has a caller outside its own module", () => {
  for (const { fn, definedIn, why } of ACTIONS) {
    it(`${fn}() — ${why}`, () => {
      const sites = callSites(fn, definedIn);
      expect(sites, `${fn}() is defined in ${definedIn} but nothing calls it`).not.toHaveLength(0);
    });
  }
});

describe("the old fake data is really gone", () => {
  // Comments stripped: several of these names survive only in the comments that
  // explain what they used to be.
  const readAll = () =>
    FILES.map((f) => ({ f: path.relative(SRC, f), src: stripComments(readFileSync(f, "utf8")) }));

  it("no screen imports the deleted hardcoded checkout basket", () => {
    const bad = readAll().filter(({ src }) => src.includes("CHECKOUT_ITEMS") || src.includes("CHECKOUT_SUBTOTAL"));
    expect(bad.map((b) => b.f)).toEqual([]);
  });

  it("the shop's private ORDERS array is gone", () => {
    const bad = readAll().filter(({ src }) => /export const ORDERS\s*:/.test(src));
    expect(bad.map((b) => b.f)).toEqual([]);
  });

  it("the chat screen no longer answers itself at random", () => {
    const chat = readFileSync(path.join(SRC, "screens/ChatScreen.tsx"), "utf8");
    expect(chat).not.toContain("SHOP_REPLIES");
    // The stand-in for unstaffed demo shops is allowed, and is named as such.
    expect(chat).toContain("UNSTAFFED_REPLIES");
  });
});
