// Research layer for the เมต้า customer assistant — grounds herb/health answers
// so Gemma answers from evidence instead of its own weights.
//
// Two tiers (hybrid):
//   1. Curated in-app knowledge base (src/data/herbKB.ts) — instant, reviewed.
//   2. Live external lookup — Wikipedia TH (EN fallback) REST API, keyless, so
//      the demo works without a backend. Swap `webResearch` for a proper
//      search proxy (Tavily/Google CSE on BMS Cloud) later without touching
//      callers.
import { searchHerbKB, type HerbKBEntry } from "../data/herbKB";

export type ResearchSource = { title: string; org: string; url: string };

export type ResearchResult = {
  /** Evidence block injected into the LLM system prompt ("" = nothing found). */
  grounding: string;
  sources: ResearchSource[];
  from: "kb" | "web" | null;
};

const EMPTY: ResearchResult = { grounding: "", sources: [], from: null };

// ---------------------------------------------------------------- KB tier --

function kbGrounding(hits: HerbKBEntry[]): ResearchResult {
  const top = hits.slice(0, 3);
  const grounding = top
    .map((e) =>
      [
        `【${e.title}】`,
        `สรรพคุณ (ใช้ถ้อยคำระวังตามนี้): ${e.properties.join(" · ")}`,
        `ข้อควรระวัง: ${e.cautions.join(" · ")}`,
      ].join("\n"),
    )
    .join("\n\n");
  // Dedup references across entries (same org/url appears in several herbs).
  const seen = new Set<string>();
  const sources = top
    .flatMap((e) => e.refs)
    .filter((r) => (seen.has(r.url) ? false : (seen.add(r.url), true)))
    .slice(0, 4);
  return { grounding, sources, from: "kb" };
}

// --------------------------------------------------------------- Web tier --

type WikiSearchItem = { title: string };

async function wikiFetch(url: string, signal?: AbortSignal): Promise<any> {
  const res = await fetch(url, { signal, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`wiki ${res.status}`);
  return res.json();
}

/** Search one Wikipedia language edition and pull plain-text intro extracts. */
async function wikiLookup(lang: "th" | "en", query: string, signal?: AbortSignal): Promise<ResearchResult> {
  const base = `https://${lang}.wikipedia.org/w/api.php`;
  const search = await wikiFetch(
    `${base}?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=2&format=json&origin=*`,
    signal,
  );
  const titles: string[] = ((search?.query?.search ?? []) as WikiSearchItem[]).map((s) => s.title).filter(Boolean);
  if (titles.length === 0) return EMPTY;

  const extracts = await wikiFetch(
    // redirects=1 so a redirect title (e.g. "ขมิ้น" → "ขมิ้นชัน") still yields its extract.
    `${base}?action=query&prop=extracts&exintro=1&explaintext=1&redirects=1&titles=${encodeURIComponent(titles.join("|"))}&format=json&origin=*`,
    signal,
  );
  const pages = Object.values((extracts?.query?.pages ?? {}) as Record<string, { title?: string; extract?: string }>);
  const found = pages.filter((p) => p.title && p.extract?.trim());
  if (found.length === 0) return EMPTY;

  const grounding = found
    .map((p) => `【${p.title} — Wikipedia】\n${p.extract!.trim().slice(0, 900)}`)
    .join("\n\n");
  const sources: ResearchSource[] = found.map((p) => ({
    title: p.title!,
    org: lang === "th" ? "วิกิพีเดียไทย" : "Wikipedia (EN)",
    url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(p.title!.replace(/ /g, "_"))}`,
  }));
  return { grounding, sources, from: "web" };
}

/** Live lookup with a hard time budget so chat never hangs on slow networks. */
export async function webResearch(query: string, timeoutMs = 6000): Promise<ResearchResult> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const th = await wikiLookup("th", query, ctrl.signal);
    if (th.from) return th;
    return await wikiLookup("en", query, ctrl.signal);
  } catch {
    return EMPTY;
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------- Hybrid --

/**
 * KB first (instant, curated); web only when the KB has nothing AND the
 * caller says the question looks herb/health-shaped (`allowWeb`) — keeps
 * chit-chat turns free of network latency.
 */
export async function research(query: string, allowWeb: boolean): Promise<ResearchResult> {
  const hits = searchHerbKB(query);
  if (hits.length > 0) return kbGrounding(hits);
  if (!allowWeb) return EMPTY;
  return webResearch(query);
}
