#!/usr/bin/env node
/**
 * Mutation testing — testing the tests.
 *
 * A suite that always passes proves nothing: maybe the code is right, maybe the
 * assertions are toothless. This deliberately breaks the source, one defect at
 * a time, and requires the suite to FAIL each time. A mutation the suite lets
 * through ("survived") is a real gap in the tests, whatever the coverage says.
 *
 * Each mutation names the defect it simulates and the test file expected to
 * catch it, so a kill is fast (~1–2 s) and a survivor is actionable.
 *
 *   npm run test:mutation
 *
 * The file is always restored, even on crash; exits non-zero if anything survives.
 */
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const MUTATIONS = [
  {
    name: "order state machine allows any jump",
    file: "src/store/types.ts",
    find: "return NEXT_STATUS[from].includes(to);",
    replace: "return true;",
    tests: "src/store/orders.test.ts",
  },
  {
    name: "checkout skips the stock reservation",
    file: "src/store/orders.ts",
    find: "if (!reserveStock(lines, { shopName: input.shopName })) {",
    replace: "if (false && !reserveStock(lines, { shopName: input.shopName })) {",
    tests: "src/store/orders.test.ts",
  },
  {
    name: "discount no longer clamped to the base price",
    file: "src/store/promotions.ts",
    find: "return Math.min(capped, base);",
    replace: "return capped;",
    tests: "src/store/promotions.test.ts test/fuzz.test.ts",
  },
  {
    name: "flash sale no longer beats promotions",
    file: "src/store/promotions.ts",
    find: "if (flash && flashRunning(flash, now) && flash.flashPrice < basePrice) {",
    replace: "if (false && flash && flashRunning(flash, now) && flash.flashPrice < basePrice) {",
    tests: "src/store/promotions.test.ts",
  },
  {
    name: "redeeming a coupon stops counting",
    file: "src/store/coupons.ts",
    find: "coupons: s.coupons.map((c) => (c.id === couponId ? { ...c, used: c.used + 1 } : c)),",
    replace: "coupons: s.coupons.map((c) => (c.id === couponId ? { ...c, used: c.used } : c)),",
    tests: "src/store/coupons.test.ts",
  },
  {
    name: "contraindications switched off (coffee for insomnia again)",
    file: "src/data/productGoals.ts",
    find: "goals.some((g) => goalsOf(productId).avoid.includes(g));",
    replace: "false;",
    tests: "test/aiSafety.test.ts",
  },
  {
    name: "goal extraction goes blind",
    file: "src/data/aiEngine.ts",
    find: "const hits: HealthGoal[] = [];",
    replace: "const hits: HealthGoal[] = []; if (t.length >= 0) return hits;",
    tests: "test/aiEval.test.ts",
  },
  {
    name: "maleify stops collapsing ครับครับ",
    file: "src/services/metaAI.ts",
    find: '.replace(/(ครับ)(\\s*ครับ)+/g, "ครับ");',
    replace: ";",
    tests: "test/aiEval.test.ts",
  },
  {
    name: "chat badges the sender instead of the reader",
    file: "src/store/chat.ts",
    find: "? { ...t, unreadShop: t.unreadShop + 1 }",
    replace: "? { ...t, unreadCustomer: t.unreadCustomer + 1 }",
    tests: "src/store/chat.test.ts",
  },
  {
    name: "cancelled orders count as revenue",
    file: "src/store/analytics.ts",
    find: 'export const countsAsRevenue = (o: Order): boolean => o.status !== "cancelled";',
    replace: "export const countsAsRevenue = (o: Order): boolean => true;",
    tests: "src/store/analytics.test.ts",
  },
  {
    name: "seed orders may be stamped in the future",
    file: "src/data/seedClock.ts",
    find: "return t <= ceiling ? t : ceiling - clampSeq++ * 1000;",
    replace: "return t;",
    tests: "test/boot.test.ts",
  },
  {
    name: "two buyers share one chat thread again",
    file: "src/store/chat.ts",
    find: "export const threadIdFor = (userId: string, shopName: string): string => `t-${userId}-${shopName}`;",
    replace: "export const threadIdFor = (userId: string, shopName: string): string => `t-${shopName}`;",
    tests: "src/store/chat.test.ts",
  },
];

const run = (cmd) =>
  execSync(cmd, {
    stdio: "pipe",
    env: { ...process.env, NODE_OPTIONS: "--no-experimental-strip-types" },
  });

const survivors = [];
let killed = 0;

for (const m of MUTATIONS) {
  const original = readFileSync(m.file, "utf8");
  if (!original.includes(m.find)) {
    console.log(`⚠️  ${m.name} — pattern not found in ${m.file} (code drifted; fix the mutation)`);
    survivors.push(`${m.name} (pattern missing)`);
    continue;
  }
  writeFileSync(m.file, original.replace(m.find, m.replace));
  let caught = false;
  try {
    run(`npx vitest run ${m.tests}`);
  } catch {
    caught = true; // the suite failed — the mutant was killed
  } finally {
    writeFileSync(m.file, original);
  }
  if (caught) {
    killed += 1;
    console.log(`☠️  killed   ${m.name}`);
  } else {
    survivors.push(m.name);
    console.log(`🧟 SURVIVED ${m.name}  ← the tests did not notice this defect`);
  }
}

console.log(`\n${killed}/${MUTATIONS.length} mutants killed`);
if (survivors.length) {
  console.error(`\nSurvivors — each one is a missing assertion:`);
  for (const s of survivors) console.error(`  - ${s}`);
  process.exit(1);
}
