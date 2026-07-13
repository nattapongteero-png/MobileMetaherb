/**
 * Chaos: what the assistant does when the WORLD breaks — endpoint down, garbage
 * responses, hangs. The contract: services reject cleanly (the context catches
 * and falls back to the rule-based reply), research() swallows and returns
 * empty, and nothing ever hangs a chat turn.
 *
 * Offline — the network here is a stub. Runs in `npm test`.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { metaChat, metaPlan, metaRecommend } from "../src/services/metaAI";
import { research } from "../src/services/herbResearch";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  vi.useRealTimers();
});

const stub = (impl: (url: string, opts?: RequestInit) => Promise<Response>) => {
  globalThis.fetch = impl as typeof fetch;
};

const ok = (body: unknown): Promise<Response> =>
  Promise.resolve(new Response(JSON.stringify(body), { status: 200 }));

const chatBody = (content: unknown) => ({ choices: [{ message: { content } }] });

const HIST = [{ role: "user" as const, text: "สวัสดีครับ" }];
const CANDS = [{ id: "1", name: "น้ำผึ้งมะนาว" }];

describe("the endpoint is down", () => {
  it("HTTP 500 → every service rejects with the status, none hang", async () => {
    stub(() => Promise.resolve(new Response("boom", { status: 500 })));
    await expect(metaPlan(HIST)).rejects.toThrow(/500/);
    await expect(metaChat(HIST)).rejects.toThrow();
    await expect(metaRecommend("นอนไม่หลับ", CANDS, "")).rejects.toThrow();
  });

  it("network failure → rejects, does not return a half-answer", async () => {
    stub(() => Promise.reject(new TypeError("Network request failed")));
    await expect(metaPlan(HIST)).rejects.toThrow();
    await expect(metaChat(HIST)).rejects.toThrow();
  });
});

describe("the endpoint answers garbage", () => {
  it("non-JSON body → rejects", async () => {
    stub(() => Promise.resolve(new Response("<html>gateway error</html>", { status: 200 })));
    await expect(metaPlan(HIST)).rejects.toThrow();
    await expect(metaChat(HIST)).rejects.toThrow();
  });

  it("JSON without content → rejects rather than answering nothing", async () => {
    stub(() => ok({ choices: [] }));
    await expect(metaPlan(HIST)).rejects.toThrow(/no plan content/);
    await expect(metaChat(HIST)).rejects.toThrow(/empty/i);
  });

  it("plan content that is not JSON → rejects", async () => {
    stub(() => ok(chatBody("นี่ไม่ใช่ json")));
    await expect(metaPlan(HIST)).rejects.toThrow();
  });

  it("plan JSON missing the action → rejects", async () => {
    stub(() => ok(chatBody(JSON.stringify({ reply: "ครับ" }))));
    await expect(metaPlan(HIST)).rejects.toThrow(/invalid plan/);
  });

  it("recommend with a malformed shape → degrades to an empty pick, never crashes", async () => {
    stub(() => ok(chatBody(JSON.stringify({ foo: 1 }))));
    const r = await metaRecommend("นอนไม่หลับ", CANDS, "");
    expect(r.productIds).toEqual([]);
    expect(typeof r.reply).toBe("string");
  });

  it("an empty chat answer is an error, not a blank bubble", async () => {
    stub(() => ok(chatBody("   ")));
    await expect(metaChat(HIST)).rejects.toThrow(/empty/i);
  });
});

describe("the endpoint hangs", () => {
  it("a caller-supplied abort cuts the wait", async () => {
    stub((_u, opts) =>
      new Promise((_res, rej) => {
        opts?.signal?.addEventListener("abort", () => rej(new DOMException("Aborted", "AbortError")));
      }),
    );
    const ctrl = new AbortController();
    setTimeout(() => ctrl.abort(), 50);
    const t0 = Date.now();
    await expect(metaChat(HIST, ctrl.signal)).rejects.toThrow();
    expect(Date.now() - t0).toBeLessThan(2_000);
  });

  it("every service passes SOME signal even when the caller passes none", async () => {
    // The default 20 s timeout — without it a hung endpoint hung the chat forever.
    const seen: (AbortSignal | null | undefined)[] = [];
    stub((_u, opts) => {
      seen.push(opts?.signal);
      return ok(chatBody(JSON.stringify({ action: "answer", reply: "ครับ" })));
    });
    await metaPlan(HIST);
    await metaChat(HIST).catch(() => {}); // content is JSON text; fine either way
    await metaRecommend("x", CANDS, "").catch(() => {});
    for (const s of seen) expect(s, "a fetch went out with no abort signal").toBeInstanceOf(AbortSignal);
  });
});

describe("research degrades instead of failing", () => {
  it("web down + KB hit → answers from the KB", async () => {
    stub(() => Promise.reject(new TypeError("offline")));
    const r = await research("อบเชย", true);
    expect(r.from).toBe("kb");
    expect(r.grounding.length).toBeGreaterThan(0);
  });

  it("web down + no KB entry → empty grounding, no throw", async () => {
    stub(() => Promise.reject(new TypeError("offline")));
    const r = await research("สมุนไพรที่ไม่มีอยู่จริง xyz", true);
    expect(r.grounding).toBe("");
    expect(r.sources).toEqual([]);
  });

  it("web returns garbage → same graceful empty", async () => {
    stub(() => Promise.resolve(new Response("not json", { status: 200 })));
    const r = await research("สมุนไพรที่ไม่มีอยู่จริง xyz", true);
    expect(r.grounding).toBe("");
  });
});
