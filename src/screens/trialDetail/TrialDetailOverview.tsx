/* =============================================================================
 *  TrialDetailOverview — the ภาพรวม (overview) tab of the owner trial detail
 *  screen. Ported 1:1 from the METAHERB web app TrialOverviewDashboard
 *  (../Metaherb/src/app/pages/owner/OwnerTrialTabs.tsx @ L4605).
 *
 *  Computes everything from getRegistrationsForTrial(product.id) exactly like
 *  the web: demographics (gender 4-up + 3D illustrations, age bar chart),
 *  ความพึงพอใจโดยรวม (1-5 star distribution), แนะนำให้คนอื่น (NPS) with the
 *  three Promoters/Passives/Detractors illustration cards, the per-question
 *  analytics grouped by phase, and the comments section.
 *
 *  RN translation notes (web is React-DOM):
 *    - div→View, p/span/h3→Text, img→Image, hover/Recharts/framer-motion removed.
 *    - Charts are hand-built View bars. Hover tooltips/popovers/modals are
 *      dropped (mockup) — the inline stats already carry the key numbers.
 *    - Colors / Thai copy / section titles kept byte-identical to the web.
 *  ========================================================================== */

import { useMemo, useState } from "react";
import { View, Text, Image, Pressable, ScrollView } from "react-native";
import {
  Star,
  BarChart3,
  ChevronRight,
  Calendar,
  Check,
  ThumbsUp,
  AlertTriangle,
} from "lucide-react-native";
import { Svg, Rect, Polygon, Circle, G } from "react-native-svg";
import { BottomSheet } from "../../components/BottomSheet";
import type { TrialProduct } from "../TrialProductsScreen";
import {
  getRegistrationsForTrial,
  computeQuestionStat,
  generateEvalQuestions,
  type Registration,
  type Gender,
  type AgeRange,
  type PerQuestionStat,
  type EvalQuestion,
  type Phase,
  type TestObjective,
} from "../../data/ownerTrialRegistrations";
import {
  DIVIDER_GRAY,
  SURFACE_GRAY,
  STAR_YELLOW,
} from "../../theme/tokens";

/* ----- shared palette (matches web hex exactly) ----- */
const INK = "#1a1a1a";
const GRAY_500 = "#6b7280";
const GRAY_400 = "#9ca3af";
const GRAY_100 = "#f3f4f6";
const GREEN = "#319754";
const AMBER = "#f59e0b";
const AMBER_DARK = "#a16207";
const RED = "#ef4444";

/* ----- gender illustration assets (already copied to assets/trial) ----- */
const genderWomenImg = require("../../../assets/trial/women.png");
const genderMenImg = require("../../../assets/trial/men.png");
const genderLgbtqImg = require("../../../assets/trial/lgbtq.png");
const genderOtherImg = require("../../../assets/trial/other.png");
const imgDetractors = require("../../../assets/trial/Detractors.png");
const imgPassives = require("../../../assets/trial/Passives.png");
const imgPromoters = require("../../../assets/trial/Promoters.png");

const AGE_RANGES: AgeRange[] = ["15-24", "25-34", "35-44", "45-54", "55+"];

/** Per-phase accent recipe — ported from PHASE_RECIPE (OwnerTrialTabs L3755). */
const PHASE_RECIPE: Record<Phase, { label: string; color: string }> = {
  baseline: { label: "ก่อนใช้สินค้า", color: "#3b82f6" },
  first_use: { label: "ระหว่างใช้", color: "#a855f7" },
  after_full: { label: "หลังใช้ครบกำหนด", color: "#319754" },
  always: { label: "สรุปท้ายฟอร์ม", color: "#f59e0b" },
};

/** All five web eval configs share this objective set (DEFAULT_OBJECTIVES). */
const DEFAULT_OBJECTIVES: TestObjective[] = ["efficacy", "packaging", "market", "formula_ab"];

/* ============================================================================
 *  Small shared pieces
 *  ========================================================================== */

function SectionCard({
  title,
  subtitle,
  titleWeight = "700",
  right,
  children,
}: {
  title: string;
  subtitle?: string;
  titleWeight?: "600" | "700";
  right?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 18 }}>
      <View className="flex-row items-start justify-between" style={{ gap: 10, marginBottom: 14 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 17, fontWeight: titleWeight, color: INK, lineHeight: 22 }}>{title}</Text>
          {subtitle ? (
            <Text style={{ fontSize: 11.5, color: GRAY_500, marginTop: 4, lineHeight: 16 }}>{subtitle}</Text>
          ) : null}
        </View>
        {right}
      </View>
      {children}
    </View>
  );
}

function Badge({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999 }}>
      <Text style={{ fontSize: 10.5, fontWeight: "700", color }}>{label}</Text>
    </View>
  );
}

function EmptyAnswerState({ message = "ยังไม่มีข้อมูล" }: { message?: string }) {
  return (
    <View style={{ backgroundColor: "rgba(249,250,251,0.6)", borderRadius: 8, paddingVertical: 24, alignItems: "center" }}>
      <Text style={{ fontSize: 11.5, color: GRAY_400, fontStyle: "italic" }}>{message}</Text>
    </View>
  );
}

/** Simple initial avatar (web uses remote portraits; mobile mockup stays offline). */
function Avatar({ name, gender }: { name: string; gender?: Gender }) {
  const bg = gender === "female" ? "#fbcfe8" : gender === "male" ? "#bfdbfe" : gender === "lgbtq" ? "#e9d5ff" : "#e5e7eb";
  const fg = gender === "female" ? "#be185d" : gender === "male" ? "#1d4ed8" : gender === "lgbtq" ? "#7e22ce" : "#6b7280";
  const initial = (name ?? "?").trim().charAt(0) || "?";
  return (
    <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: bg, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center", justifyContent: "center" }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: fg }}>{initial}</Text>
    </View>
  );
}

/* ============================================================================
 *  Demographics — gender (4 pastel circles + illustration) + age bars
 *  ========================================================================== */

/** One 2.5D column — front + lighter top + darker right face (web Bar3D look). */
function Bar25D({ faceW, h, totalH, depth = 7, front, top, side }: { faceW: number; h: number; totalH: number; depth?: number; front: string; top: string; side: string }) {
  const w = faceW;
  const W = w + depth;
  const base = totalH;
  const barTop = base - h;
  const topPts = `0,${barTop} ${w},${barTop} ${w + depth},${barTop - depth} ${depth},${barTop - depth}`;
  const sidePts = `${w},${barTop} ${w + depth},${barTop - depth} ${w + depth},${base - depth} ${w},${base}`;
  return (
    <Svg width={W} height={totalH}>
      {h > 0 ? (
        <>
          <Polygon points={sidePts} fill={side} />
          <Polygon points={topPts} fill={top} />
          <Rect x={0} y={barTop} width={w} height={h} fill={front} />
        </>
      ) : null}
    </Svg>
  );
}

/** Row inside a chart-detail BottomSheet: icon + label left, value right. */
function DetailRow({ Icon, label, value, valueColor }: { Icon: typeof Calendar; label: string; value: string; valueColor?: string }) {
  return (
    <View className="flex-row items-center justify-between" style={{ paddingVertical: 7 }}>
      <View className="flex-row items-center" style={{ gap: 8 }}>
        <Icon size={14} color={GRAY_400} strokeWidth={2.2} />
        <Text style={{ fontSize: 12.5, color: GRAY_500 }}>{label}</Text>
      </View>
      <Text style={{ fontSize: 12.5, fontWeight: "700", color: valueColor ?? INK }}>{value}</Text>
    </View>
  );
}

/** Per-gender breakdown — mirrors the web HoverCard body (L4766-4790). */
function genderDetail(applicants: Registration[], key: string) {
  const group = applicants.filter((r) => (r.gender || "unknown") === key);
  const cnt = group.length;
  const evaluatedInGroup = group.filter((r) => !!r.evaluatedAt);
  const recommend = evaluatedInGroup.filter((r) => r.evaluation?.wouldRecommend).length;
  const recommendPct = evaluatedInGroup.length > 0 ? Math.round((recommend / evaluatedInGroup.length) * 100) : 0;
  const avg = evaluatedInGroup.length > 0 ? evaluatedInGroup.reduce((s, r) => s + (r.evaluation?.overall ?? 0), 0) / evaluatedInGroup.length : 0;
  const topAge = AGE_RANGES.map((ar) => ({ range: ar, cnt: group.filter((r) => r.ageRange === ar).length }))
    .filter((a) => a.cnt > 0)
    .sort((a, b) => b.cnt - a.cnt)[0];
  return { cnt, evaluated: evaluatedInGroup.length, recommend, recommendPct, avg, topAge };
}

function GenderSection({ applicants, genderStats }: { applicants: Registration[]; genderStats: Record<string, number> }) {
  const cells = [
    { key: "female", label: "หญิง", bg: "#fbcfe8", accent: "#ec4899", text: INK, img: genderWomenImg },
    { key: "male", label: "ชาย", bg: "#bfdbfe", accent: "#3b82f6", text: INK, img: genderMenImg },
    { key: "lgbtq", label: "LGBTQ+", bg: "#e9d5ff", accent: "#a855f7", text: INK, img: genderLgbtqImg },
    { key: "unknown", label: "อื่นๆ", bg: "#e5e7eb", accent: "#6b7280", text: INK, img: genderOtherImg },
  ] as const;
  const [sel, setSel] = useState<(typeof cells)[number] | null>(null);
  const total = applicants.length;
  const d = sel ? genderDetail(applicants, sel.key) : null;
  const pctOf = (n: number) => (total > 0 ? Math.round((n / total) * 100) : 0);

  return (
    <SectionCard
      title="เพศของผู้ทดลอง"
      subtitle="สัดส่วนเพศของ Tester ทั้งหมดในการทดลองนี้ — แตะเพื่อดูรายละเอียดเพิ่มเติม"
      titleWeight="600"
    >
      {applicants.length === 0 ? (
        <Text style={{ fontSize: 12, color: GRAY_400, fontStyle: "italic" }}>ยังไม่มีข้อมูล</Text>
      ) : (
        <View className="flex-row" style={{ gap: 8 }}>
          {cells.map((g) => {
            const cnt = genderStats[g.key] || 0;
            const pct = pctOf(cnt);
            return (
              <Pressable key={g.key} onPress={() => setSel(g)} className="active:opacity-80" style={{ flex: 1, alignItems: "center" }}>
                {/* Pastel circle */}
                <View style={{ width: "92%", aspectRatio: 1, borderRadius: 999, backgroundColor: g.bg, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 }}>
                  <Text style={{ fontSize: 12, fontWeight: "500", color: g.text, textAlign: "center" }}>{g.label}</Text>
                  <Text style={{ fontSize: 24, fontWeight: "800", color: g.text, marginVertical: 3 }}>{cnt}</Text>
                  <Text style={{ fontSize: 11, fontWeight: "500", color: g.text }}>{pct}%</Text>
                </View>
                {/* Illustration peeking below the circle */}
                <Image source={g.img} resizeMode="contain" style={{ width: "100%", height: 46, marginTop: -14 }} />
              </Pressable>
            );
          })}
        </View>
      )}

      <BottomSheet centerTitle visible={!!sel} onClose={() => setSel(null)} title={sel?.label ?? ""} minHeightRatio={0.4} maxHeightRatio={0.5}>
        {sel && d ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
            <View className="flex-row items-center" style={{ gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: GRAY_100 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: sel.accent }} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: sel.accent }}>{sel.label}</Text>
              <Text style={{ fontSize: 11.5, color: GRAY_400, marginLeft: "auto" }}>{d.cnt}/{applicants.length} · {pctOf(d.cnt)}%</Text>
            </View>
            {d.topAge ? <DetailRow Icon={Calendar} label="อายุส่วนใหญ่" value={`${d.topAge.range} (${d.topAge.cnt} คน)`} /> : null}
            {d.evaluated > 0 ? (
              <>
                <DetailRow Icon={Check} label="ประเมินแล้ว" value={`${d.evaluated}/${d.cnt} คน`} />
                <DetailRow Icon={Star} label="คะแนนเฉลี่ย" value={`${d.avg.toFixed(1)}/5`} valueColor={AMBER} />
                <DetailRow Icon={ThumbsUp} label="แนะนำ" value={`${d.recommend}/${d.evaluated} (${d.recommendPct}%)`} valueColor={GREEN} />
              </>
            ) : (
              <Text style={{ fontSize: 12, color: GRAY_400, fontStyle: "italic", paddingTop: 8 }}>ยังไม่มีผู้ประเมินในกลุ่มนี้</Text>
            )}
          </View>
        ) : null}
      </BottomSheet>
    </SectionCard>
  );
}

/** Per-age-range breakdown for the chart-detail sheet. */
function ageDetail(applicants: Registration[], range: string) {
  const group = applicants.filter((r) => r.ageRange === range);
  const cnt = group.length;
  const evaluatedInGroup = group.filter((r) => !!r.evaluatedAt);
  const recommend = evaluatedInGroup.filter((r) => r.evaluation?.wouldRecommend).length;
  const recommendPct = evaluatedInGroup.length > 0 ? Math.round((recommend / evaluatedInGroup.length) * 100) : 0;
  const avg = evaluatedInGroup.length > 0 ? evaluatedInGroup.reduce((s, r) => s + (r.evaluation?.overall ?? 0), 0) / evaluatedInGroup.length : 0;
  const GENDER_LABEL: Record<string, string> = { female: "หญิง", male: "ชาย", lgbtq: "LGBTQ+", unknown: "อื่นๆ" };
  const topGender = ["female", "male", "lgbtq", "unknown"]
    .map((k) => ({ k, cnt: group.filter((r) => (r.gender || "unknown") === k).length }))
    .filter((a) => a.cnt > 0)
    .sort((a, b) => b.cnt - a.cnt)[0];
  return { cnt, evaluated: evaluatedInGroup.length, recommend, recommendPct, avg, topGender: topGender ? { label: GENDER_LABEL[topGender.k], cnt: topGender.cnt } : null };
}

function AgeSection({ applicants, ageStats }: { applicants: Registration[]; ageStats: { counts: Record<string, number>; unknown: number } }) {
  const PLOT_H = 180; // plot area height (Recharts inner height feel)
  const DEPTH = 7; // 2.5D extrusion depth
  const maxCnt = Math.max(1, ...AGE_RANGES.map((r) => ageStats.counts[r] || 0));
  const tickCount = Math.min(maxCnt, 4);
  const step = Math.max(1, Math.ceil(maxCnt / Math.max(1, tickCount)));
  const yTicks: number[] = [];
  for (let v = 0; v <= maxCnt; v += step) yTicks.push(v);
  if (yTicks[yTicks.length - 1] !== maxCnt) yTicks.push(maxCnt);
  const axisTop = maxCnt;
  const [sel, setSel] = useState<string | null>(null);
  const d = sel ? ageDetail(applicants, sel) : null;
  const pctOf = (n: number) => (applicants.length > 0 ? Math.round((n / applicants.length) * 100) : 0);

  return (
    <SectionCard
      title="ช่วงอายุของผู้ทดลอง"
      subtitle="การกระจายตัวของช่วงอายุ Tester — กลุ่มที่ใหญ่ที่สุดถูกเน้นเป็นสีเขียว"
      titleWeight="600"
    >
      {applicants.length === 0 ? (
        <Text style={{ fontSize: 12, color: GRAY_400, fontStyle: "italic" }}>ยังไม่มีข้อมูล</Text>
      ) : (
        <>
          <View className="flex-row" style={{ height: PLOT_H + 24 }}>
            {/* Left Y-axis (0..max) */}
            <View style={{ width: 26, height: PLOT_H, position: "relative", marginRight: 4 }}>
              {yTicks.map((t) => (
                <Text key={t} style={{ position: "absolute", right: 4, top: PLOT_H - (t / axisTop) * PLOT_H - 6, fontSize: 11, color: "#94a3b8" }}>{t}</Text>
              ))}
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ height: PLOT_H, position: "relative" }}>
                {/* Dashed gridlines */}
                {yTicks.map((t) => (
                  <View key={`grid-${t}`} style={{ position: "absolute", left: 0, right: 0, top: PLOT_H - (t / axisTop) * PLOT_H, borderTopWidth: 1, borderStyle: "dashed", borderColor: "#eef2f6" }} />
                ))}
                {/* 2.5D bars — each column a tap target */}
                <View className="flex-row items-end" style={{ position: "absolute", left: 0, right: 0, bottom: 0, top: 0, gap: 6 }}>
                  {AGE_RANGES.map((r) => {
                    const cnt = ageStats.counts[r] || 0;
                    const isMax = cnt === maxCnt && maxCnt > 0;
                    const h = cnt > 0 ? Math.max(6, (cnt / axisTop) * (PLOT_H - DEPTH)) : 0;
                    return (
                      <Pressable key={r} onPress={() => cnt > 0 && setSel(r)} className="active:opacity-70" style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                        {cnt > 0 ? (
                          <Text style={{ fontSize: 11, fontWeight: isMax ? "700" : "500", color: isMax ? GREEN : GRAY_500, marginBottom: 2 }}>{cnt}</Text>
                        ) : null}
                        <Bar25D
                          faceW={34}
                          h={h}
                          totalH={PLOT_H}
                          depth={DEPTH}
                          front={isMax ? GREEN : "#9ca3af"}
                          top={isMax ? "#3fb56b" : "#cbd5e1"}
                          side={isMax ? "#267a43" : "#6b7280"}
                        />
                      </Pressable>
                    );
                  })}
                </View>
              </View>
              {/* X-axis labels + pct */}
              <View className="flex-row" style={{ gap: 6, marginTop: 8 }}>
                {AGE_RANGES.map((r) => {
                  const cnt = ageStats.counts[r] || 0;
                  const isMax = cnt === maxCnt && maxCnt > 0;
                  return (
                    <View key={r} style={{ flex: 1, alignItems: "center" }}>
                      <Text style={{ fontSize: 11, color: GRAY_500 }}>{r}</Text>
                      <Text style={{ fontSize: 10, fontWeight: isMax ? "700" : "500", color: isMax ? GREEN : GRAY_400, marginTop: 2 }}>{pctOf(cnt)}%</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          </View>
          {ageStats.unknown > 0 ? (
            <Text style={{ fontSize: 10.5, color: GRAY_400, fontStyle: "italic", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: DIVIDER_GRAY }}>
              ไม่ระบุอายุ: {ageStats.unknown} คน
            </Text>
          ) : null}
        </>
      )}

      <BottomSheet centerTitle visible={!!sel} onClose={() => setSel(null)} title={`ช่วงอายุ ${sel ?? ""}`} minHeightRatio={0.4} maxHeightRatio={0.5}>
        {sel && d ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
            <View className="flex-row items-center" style={{ gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: GRAY_100 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: GREEN }} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: INK }}>{sel} ปี</Text>
              <Text style={{ fontSize: 11.5, color: GRAY_400, marginLeft: "auto" }}>{d.cnt}/{applicants.length} · {pctOf(d.cnt)}%</Text>
            </View>
            {d.topGender ? <DetailRow Icon={Calendar} label="เพศส่วนใหญ่" value={`${d.topGender.label} (${d.topGender.cnt} คน)`} /> : null}
            {d.evaluated > 0 ? (
              <>
                <DetailRow Icon={Check} label="ประเมินแล้ว" value={`${d.evaluated}/${d.cnt} คน`} />
                <DetailRow Icon={Star} label="คะแนนเฉลี่ย" value={`${d.avg.toFixed(1)}/5`} valueColor={AMBER} />
                <DetailRow Icon={ThumbsUp} label="แนะนำ" value={`${d.recommend}/${d.evaluated} (${d.recommendPct}%)`} valueColor={GREEN} />
              </>
            ) : (
              <Text style={{ fontSize: 12, color: GRAY_400, fontStyle: "italic", paddingTop: 8 }}>ยังไม่มีผู้ประเมินในช่วงนี้</Text>
            )}
          </View>
        ) : null}
      </BottomSheet>
    </SectionCard>
  );
}

/* ----- shared chart-detail sheet pieces ----- */
function GenderDots({ female, male, lgbtq }: { female: number; male: number; lgbtq: number }) {
  const items = [
    { n: female, label: "หญิง", color: "#ec4899" },
    { n: male, label: "ชาย", color: "#3b82f6" },
    { n: lgbtq, label: "LGBTQ+", color: "#a855f7" },
  ].filter((x) => x.n > 0);
  if (items.length === 0) return null;
  return (
    <View className="flex-row flex-wrap items-center" style={{ gap: 12, marginTop: 4 }}>
      {items.map((x) => (
        <View key={x.label} className="flex-row items-center" style={{ gap: 5 }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: x.color }} />
          <Text style={{ fontSize: 11.5, color: GRAY_500 }}>{x.label} {x.n}</Text>
        </View>
      ))}
    </View>
  );
}

function AgeTags({ ages, color }: { ages: { range: string; cnt: number }[]; color: string }) {
  if (ages.length === 0) return null;
  return (
    <View className="flex-row flex-wrap" style={{ gap: 6, marginTop: 4 }}>
      {ages.map((a) => (
        <View key={a.range} style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999, backgroundColor: `${color}14` }}>
          <Text style={{ fontSize: 10.5, fontWeight: "700", color }}>{a.range} · {a.cnt}</Text>
        </View>
      ))}
    </View>
  );
}

function SheetSubhead({ children }: { children: string }) {
  return <Text style={{ fontSize: 10, fontWeight: "700", color: GRAY_500, textTransform: "uppercase", letterSpacing: 0.5, marginTop: 12, marginBottom: 4 }}>{children}</Text>;
}

/** Per-star demographics for the satisfaction tap-sheet (web tooltip L4938-4953). */
function starDetail(evaluated: Registration[], star: number) {
  const group = evaluated.filter((r) => (r.evaluation?.overall ?? 0) === star);
  return {
    cnt: group.length,
    female: group.filter((r) => r.gender === "female").length,
    male: group.filter((r) => r.gender === "male").length,
    lgbtq: group.filter((r) => r.gender === "lgbtq").length,
    ageBreakdown: AGE_RANGES.map((ar) => ({ range: ar, cnt: group.filter((r) => r.ageRange === ar).length })).filter((a) => a.cnt > 0),
  };
}

/** Per-NPS-segment breakdown for the NPS tap-sheet (web HoverCard L5083-5143). */
function npsBucketDetail(evaluated: Registration[], range: number[]) {
  const seg = evaluated.filter((r) => {
    const v = r.evaluation?.npsScores?.["core_nps"];
    return typeof v === "number" && range.includes(v);
  });
  const scoreBreakdown = range
    .map((n) => ({ score: n, count: seg.filter((r) => r.evaluation?.npsScores?.["core_nps"] === n).length }))
    .filter((b) => b.count > 0);
  return {
    cnt: seg.length,
    scoreBreakdown,
    maxBucket: Math.max(1, ...scoreBreakdown.map((b) => b.count)),
    female: seg.filter((r) => r.gender === "female").length,
    male: seg.filter((r) => r.gender === "male").length,
    lgbtq: seg.filter((r) => r.gender === "lgbtq").length,
    ageBreak: AGE_RANGES.map((ar) => ({ range: ar, cnt: seg.filter((r) => r.ageRange === ar).length })).filter((a) => a.cnt > 0),
  };
}

/* ============================================================================
 *  ความพึงพอใจโดยรวม — 1-5 star distribution rows
 *  ========================================================================== */

function SatisfactionSection({ evaluated }: { evaluated: Registration[] }) {
  const counts = [1, 2, 3, 4, 5].map((star) => ({
    star,
    cnt: evaluated.filter((r) => r.evaluation?.overall === star).length,
  }));
  const max = Math.max(1, ...counts.map((c) => c.cnt));
  const topStar = counts.reduce((a, b) => (a.cnt >= b.cnt ? a : b)).star;
  const PLOT_H = 200; // vertical bar plot height
  const [selStar, setSelStar] = useState<number | null>(null);
  const sd = selStar != null ? starDetail(evaluated, selStar) : null;
  const selPct = selStar != null && evaluated.length > 0 && sd ? Math.round((sd.cnt / evaluated.length) * 100) : 0;

  return (
    <SectionCard
      title="ความพึงพอใจโดยรวม"
      subtitle="การกระจายคะแนนดาว 1-5 จากผู้ตอบทั้งหมด — แตะแท่งเพื่อดูข้อมูลผู้ตอบ"
      titleWeight="600"
      right={<Badge label={`${evaluated.length} ผู้ตอบ`} bg="#fffbeb" color={AMBER_DARK} />}
    >
      {/* Vertical bar per star 1..5 — count above filled stars above bar; %-axis below. */}
      <View className="flex-row items-end" style={{ height: PLOT_H, gap: 8 }}>
        {counts.map(({ star, cnt }) => {
          const heightPct = (cnt / max) * 100;
          const isTop = star === topStar && cnt > 0;
          return (
            <Pressable key={star} onPress={() => cnt > 0 && setSelStar(star)} className="active:opacity-70" style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              {/* Count number above stars */}
              {cnt > 0 ? (
                <Text style={{ fontSize: 12, fontWeight: isTop ? "700" : "600", color: isTop ? AMBER_DARK : INK }}>{cnt}</Text>
              ) : null}
              {/* Filled stars row */}
              <View className="flex-row items-center justify-center flex-wrap" style={{ gap: 1, marginTop: 2, marginBottom: 6 }}>
                {Array.from({ length: star }).map((_, i) => (
                  <Star key={i} size={11} color={AMBER} fill={AMBER} strokeWidth={0} />
                ))}
              </View>
              {/* Bar — top star amber-300→500 (#f59e0b), others amber-200/300 (#fcd34d). */}
              <View
                style={{
                  width: "100%",
                  height: Math.max(cnt > 0 ? 8 : 0, (heightPct / 100) * (PLOT_H - 44)),
                  borderTopLeftRadius: 6,
                  borderTopRightRadius: 6,
                  backgroundColor: isTop ? AMBER : "#fcd34d",
                }}
              />
            </Pressable>
          );
        })}
      </View>
      {/* %-axis row (bottom labels) */}
      <View className="flex-row items-center" style={{ gap: 8, marginTop: 8 }}>
        {counts.map(({ star, cnt }) => {
          const pct = evaluated.length > 0 ? Math.round((cnt / evaluated.length) * 100) : 0;
          const isTop = star === topStar && cnt > 0;
          return (
            <View key={star} style={{ flex: 1, alignItems: "center" }}>
              <Text style={{ fontSize: 11, fontWeight: isTop ? "700" : "500", color: isTop ? AMBER_DARK : GRAY_500 }}>{pct}%</Text>
              {/* "N ดาว · M คน (P%)" readout */}
              <Text style={{ fontSize: 9, color: GRAY_400, marginTop: 2, textAlign: "center" }}>
                {star} ดาว · {cnt} คน ({pct}%)
              </Text>
            </View>
          );
        })}
      </View>

      <BottomSheet centerTitle visible={selStar != null} onClose={() => setSelStar(null)} title={`${selStar ?? ""} ดาว`} minHeightRatio={0.4} maxHeightRatio={0.55}>
        {selStar != null && sd ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
            <View className="flex-row items-center" style={{ gap: 6, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: GRAY_100 }}>
              <Star size={14} color={AMBER} fill={AMBER} strokeWidth={0} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: AMBER_DARK }}>{selStar} ดาว</Text>
              <Text style={{ fontSize: 11.5, color: GRAY_400, marginLeft: "auto" }}>{sd.cnt} คน · {selPct}%</Text>
            </View>
            {sd.female + sd.male + sd.lgbtq > 0 ? (
              <>
                <SheetSubhead>เพศของผู้ตอบ</SheetSubhead>
                <GenderDots female={sd.female} male={sd.male} lgbtq={sd.lgbtq} />
              </>
            ) : null}
            {sd.ageBreakdown.length > 0 ? (
              <>
                <SheetSubhead>ช่วงอายุ</SheetSubhead>
                <AgeTags ages={sd.ageBreakdown} color={AMBER_DARK} />
              </>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </SectionCard>
  );
}

/* ============================================================================
 *  แนะนำให้คนอื่น (NPS) — Promoters / Passives / Detractors illustration cards
 *  + a 0-10 distribution strip
 *  ========================================================================== */

function NpsSection({ evaluated }: { evaluated: Registration[] }) {
  const dist = new Array(11).fill(0);
  let promoters = 0,
    passives = 0,
    detractors = 0,
    count = 0;
  evaluated.forEach((r) => {
    const v = r.evaluation?.npsScores?.["core_nps"];
    if (typeof v === "number" && v >= 0 && v <= 10) {
      dist[v]++;
      count++;
      if (v >= 9) promoters++;
      else if (v >= 7) passives++;
      else detractors++;
    }
  });
  const score = count > 0 ? Math.round(((promoters - detractors) / count) * 100) : 0;
  const promoterPct = count > 0 ? Math.round((promoters / count) * 100) : 0;
  const passivePct = count > 0 ? Math.round((passives / count) * 100) : 0;
  const detractorPct = count > 0 ? Math.round((detractors / count) * 100) : 0;

  const badgeBg = score >= 30 ? "#31975412" : score >= 0 ? "#fbbf2412" : "#ef444412";
  const badgeColor = score >= 30 ? GREEN : score >= 0 ? "#a16207" : "#b91c1c";

  const cards = [
    { label: "Detractors", pct: detractorPct, count: detractors, color: RED, bg: "#fef2f2", sub: "0–6", img: imgDetractors, range: [0, 1, 2, 3, 4, 5, 6] },
    { label: "Passives", pct: passivePct, count: passives, color: AMBER, bg: "#fffbeb", sub: "7–8", img: imgPassives, range: [7, 8] },
    { label: "Promoters", pct: promoterPct, count: promoters, color: GREEN, bg: "#f0fdf4", sub: "9–10", img: imgPromoters, range: [9, 10] },
  ];

  const maxBar = Math.max(1, ...dist);
  const [selBucket, setSelBucket] = useState<(typeof cards)[number] | null>(null);
  const bd = selBucket ? npsBucketDetail(evaluated, selBucket.range) : null;

  return (
    <SectionCard
      title="แนะนำให้คนอื่น (NPS)"
      subtitle="การกระจายคะแนน 0-10 จากผู้ตอบ — Promoters / Passives / Detractors"
      titleWeight="600"
      right={<Badge label={`NPS = ${score > 0 ? `+${score}` : score}`} bg={badgeBg} color={badgeColor} />}
    >
      {count === 0 ? (
        <EmptyAnswerState message="ยังไม่มีข้อมูล NPS" />
      ) : (
        <>
          {/* KPI cards with 3D illustrations */}
          <View className="flex-row" style={{ gap: 8 }}>
            {cards.map((s) => (
              <Pressable key={s.label} onPress={() => s.count > 0 && setSelBucket(s)} className="active:opacity-80" style={{ flex: 1, backgroundColor: s.bg, borderRadius: 12, padding: 10, overflow: "hidden", minHeight: 84 }}>
                <Text style={{ fontSize: 10.5, color: GRAY_500, fontWeight: "500" }}>{s.label}</Text>
                <Text style={{ fontSize: 20, fontWeight: "800", color: INK, marginTop: 6 }}>{s.pct}%</Text>
                <View style={{ alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 3, marginTop: 8, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: `${s.color}18` }}>
                  <BarChart3 size={9} color={s.color} strokeWidth={2.4} />
                  <Text style={{ fontSize: 9.5, fontWeight: "700", color: s.color }}>{s.count} คน · {s.sub}</Text>
                </View>
                {/* Illustration bottom-right */}
                <Image source={s.img} resizeMode="contain" style={{ position: "absolute", bottom: -6, right: -6, width: 56, height: 56, opacity: 0.9 }} />
              </Pressable>
            ))}
          </View>
          {/* 0-10 distribution strip */}
          <View className="flex-row items-end" style={{ gap: 3, height: 96, marginTop: 16 }}>
            {dist.map((c, i) => {
              const color = i <= 6 ? RED : i <= 8 ? "#fbbf24" : GREEN;
              return (
                <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
                  <View style={{ width: "70%", height: Math.max(c > 0 ? 4 : 0, (c / maxBar) * 70), borderRadius: 6, backgroundColor: color }} />
                  <Text style={{ fontSize: 10, color: GRAY_400, marginTop: 5 }}>{i}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      <BottomSheet centerTitle visible={!!selBucket} onClose={() => setSelBucket(null)} title={selBucket?.label ?? ""} minHeightRatio={0.45} maxHeightRatio={0.65}>
        {selBucket && bd ? (
          <View style={{ paddingHorizontal: 16, paddingTop: 4 }}>
            <View className="flex-row items-center" style={{ gap: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: GRAY_100 }}>
              <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: `${selBucket.color}15`, alignItems: "center", justifyContent: "center" }}>
                <BarChart3 size={14} color={selBucket.color} strokeWidth={2.4} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "700", color: selBucket.color }}>{selBucket.label}</Text>
                <Text style={{ fontSize: 10.5, color: GRAY_400 }}>{selBucket.count} จาก {count} คน · {selBucket.pct}%</Text>
              </View>
            </View>
            {bd.scoreBreakdown.length > 0 ? (
              <>
                <SheetSubhead>การกระจายคะแนน</SheetSubhead>
                <View style={{ gap: 6 }}>
                  {bd.scoreBreakdown.map((b) => {
                    const ofSeg = selBucket.count > 0 ? Math.round((b.count / selBucket.count) * 100) : 0;
                    return (
                      <View key={b.score} className="flex-row items-center" style={{ gap: 8 }}>
                        <Text style={{ width: 16, fontSize: 10.5, color: GRAY_500, textAlign: "center" }}>{b.score}</Text>
                        <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: GRAY_100, overflow: "hidden" }}>
                          <View style={{ width: `${(b.count / bd.maxBucket) * 100}%`, height: "100%", borderRadius: 999, backgroundColor: selBucket.color }} />
                        </View>
                        <Text style={{ fontSize: 10.5, fontWeight: "700", color: selBucket.color }}>{b.count}<Text style={{ color: GRAY_400, fontWeight: "400" }}> ({ofSeg}%)</Text></Text>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : null}
            {bd.female + bd.male + bd.lgbtq > 0 ? (
              <>
                <SheetSubhead>เพศของผู้ตอบ</SheetSubhead>
                <GenderDots female={bd.female} male={bd.male} lgbtq={bd.lgbtq} />
              </>
            ) : null}
            {bd.ageBreak.length > 0 ? (
              <>
                <SheetSubhead>ช่วงอายุ</SheetSubhead>
                <AgeTags ages={bd.ageBreak} color={selBucket.color} />
              </>
            ) : null}
          </View>
        ) : null}
      </BottomSheet>
    </SectionCard>
  );
}

/* ============================================================================
 *  Per-question analytics card bodies
 *  ========================================================================== */

function ScaleBody({ stat, accentColor }: { stat: PerQuestionStat; accentColor: string }) {
  if (!stat.scale || stat.responses === 0) return <EmptyAnswerState />;
  const { dist, avg, topAnswer } = stat.scale;
  const isStar = stat.q.type === "stars_1_5";
  const maxCount = Math.max(1, ...[1, 2, 3, 4, 5].map((n) => dist[n].count));
  return (
    <>
      <View className="flex-row items-center justify-end" style={{ marginBottom: 8 }}>
        <View className="flex-row items-center" style={{ gap: 3, paddingHorizontal: 10, paddingVertical: 2, borderRadius: 999, backgroundColor: "#fffbeb", borderWidth: 1, borderColor: "#fde68a" }}>
          <Star size={11} color={STAR_YELLOW} fill={STAR_YELLOW} strokeWidth={0} />
          <Text style={{ fontSize: 11, fontWeight: "700", color: AMBER_DARK }}>{avg.toFixed(1)}</Text>
          <Text style={{ fontSize: 10, fontWeight: "400", color: STAR_YELLOW }}>{isStar ? "ดาว" : "/5"}</Text>
        </View>
      </View>
      <View style={{ gap: 4 }}>
        {[5, 4, 3, 2, 1].map((n) => {
          const b = dist[n];
          const pct = stat.responses > 0 ? Math.round((b.count / stat.responses) * 100) : 0;
          const isTop = n === topAnswer && b.count > 0;
          return (
            <View key={n} className="flex-row items-center" style={{ gap: 8 }}>
              <Text style={{ width: 12, fontSize: 10.5, color: GRAY_500, fontWeight: "600", textAlign: "center" }}>{n}</Text>
              <View style={{ flex: 1, height: 6, borderRadius: 999, backgroundColor: GRAY_100, overflow: "hidden" }}>
                <View style={{ width: `${(b.count / maxCount) * 100}%`, height: "100%", borderRadius: 999, backgroundColor: isTop ? accentColor : "#fbbf24" }} />
              </View>
              <Text style={{ width: 58, fontSize: 10.5, textAlign: "right", color: isTop ? accentColor : GRAY_500, fontWeight: "700" }}>
                {b.count}<Text style={{ color: GRAY_400, fontWeight: "400" }}> ({pct}%)</Text>
              </Text>
            </View>
          );
        })}
      </View>
    </>
  );
}

function NpsBody({ stat }: { stat: PerQuestionStat }) {
  if (!stat.nps || stat.responses === 0) return <EmptyAnswerState />;
  const { dist, score, promoters, passives, detractors } = stat.nps;
  const pPct = stat.responses > 0 ? Math.round((promoters / stat.responses) * 100) : 0;
  const paPct = stat.responses > 0 ? Math.round((passives / stat.responses) * 100) : 0;
  const dPct = stat.responses > 0 ? Math.round((detractors / stat.responses) * 100) : 0;
  const maxBar = Math.max(1, ...dist);
  const badgeBg = score >= 30 ? "#31975412" : score >= 0 ? "#fbbf2412" : "#ef444412";
  const badgeColor = score >= 30 ? GREEN : score >= 0 ? "#a16207" : "#b91c1c";
  return (
    <>
      <View className="flex-row items-end" style={{ gap: 3, height: 72 }}>
        {dist.map((c: number, i: number) => {
          const color = i <= 6 ? RED : i <= 8 ? "#fbbf24" : GREEN;
          return (
            <View key={i} style={{ flex: 1, alignItems: "center", justifyContent: "flex-end", height: "100%" }}>
              <View style={{ width: "72%", height: Math.max(c > 0 ? 3 : 0, (c / maxBar) * 52), borderTopLeftRadius: 6, borderTopRightRadius: 6, backgroundColor: color }} />
              <Text style={{ fontSize: 9, color: GRAY_500, marginTop: 3 }}>{i}</Text>
            </View>
          );
        })}
      </View>
      <View className="flex-row" style={{ gap: 8, marginTop: 12 }}>
        {[
          { label: "Promoters", value: pPct, color: GREEN, sub: `${promoters} คน` },
          { label: "Passives", value: paPct, color: "#fbbf24", sub: `${passives} คน` },
          { label: "Detractors", value: dPct, color: RED, sub: `${detractors} คน` },
        ].map((s) => (
          <View key={s.label} style={{ flex: 1, backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: DIVIDER_GRAY, paddingHorizontal: 8, paddingVertical: 8, alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: s.color }}>{s.value}%</Text>
            <Text style={{ fontSize: 10.5, fontWeight: "600", color: GRAY_500 }}>{s.label}</Text>
            <Text style={{ fontSize: 9.5, color: GRAY_400 }}>{s.sub}</Text>
          </View>
        ))}
      </View>
      <View className="flex-row items-center justify-center" style={{ marginTop: 8 }}>
        <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: badgeBg }}>
          <Text style={{ fontSize: 12, fontWeight: "700", color: badgeColor }}>NPS = {score > 0 ? `+${score}` : score}</Text>
        </View>
      </View>
    </>
  );
}

function McBody({ stat, accentColor }: { stat: PerQuestionStat; accentColor: string }) {
  if (!stat.mc || stat.responses === 0) return <EmptyAnswerState />;
  const { options, counts, topOption } = stat.mc;
  const sorted = [...options].sort((a, b) => (counts[b] ?? 0) - (counts[a] ?? 0));
  const maxCount = Math.max(1, ...sorted.map((o) => counts[o] ?? 0));
  return (
    <View style={{ gap: 6 }}>
      {sorted.map((opt) => {
        const c = counts[opt] ?? 0;
        const pct = stat.responses > 0 ? Math.round((c / stat.responses) * 100) : 0;
        const isTop = opt === topOption && c > 0;
        return (
          <View key={opt} style={{ backgroundColor: "#fff", borderRadius: 8, borderWidth: 1, borderColor: DIVIDER_GRAY, paddingHorizontal: 10, paddingVertical: 6 }}>
            <View className="flex-row items-center justify-between" style={{ gap: 8, marginBottom: 4 }}>
              <Text numberOfLines={1} style={{ flex: 1, fontSize: 11.5, color: INK, fontWeight: isTop ? "700" : "500" }}>{opt}</Text>
              <Text style={{ fontSize: 10.5, color: isTop ? accentColor : GRAY_500, fontWeight: "700" }}>
                {c} <Text style={{ color: GRAY_400, fontWeight: "400" }}>({pct}%)</Text>
              </Text>
            </View>
            <View style={{ height: 8, borderRadius: 999, backgroundColor: GRAY_100, overflow: "hidden" }}>
              <View style={{ width: `${(c / maxCount) * 100}%`, height: "100%", borderRadius: 999, backgroundColor: isTop ? accentColor : "#cbd5e1" }} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function TagBody({ stat, accentColor }: { stat: PerQuestionStat; accentColor: string }) {
  if (!stat.tag || stat.responses === 0) return <EmptyAnswerState />;
  const entries = Object.entries(stat.tag.counts).sort((a, b) => b[1] - a[1]);
  const maxCount = Math.max(1, ...entries.map((e) => e[1]));
  return (
    <View className="flex-row flex-wrap" style={{ gap: 6 }}>
      {entries.map(([tag, c]) => {
        const isTop = c === maxCount;
        return (
          <View key={tag} style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: isTop ? accentColor : `${accentColor}20` }}>
            <Text style={{ fontSize: 11.5, color: isTop ? "#fff" : accentColor, fontWeight: isTop ? "700" : "600" }}>{tag}</Text>
            <Text style={{ fontSize: 10.5, color: isTop ? "#fff" : accentColor, opacity: 0.8 }}>· {c}</Text>
          </View>
        );
      })}
    </View>
  );
}

/** Two-segment donut (ไม่มี green + มี red) — ports the web Recharts PieChart. */
function CondDonut({ yes, no }: { yes: number; no: number }) {
  const total = yes + no;
  const size = 120;
  const sw = 14;
  const R = (size - sw) / 2;
  const C = 2 * Math.PI * R;
  const gap = yes > 0 && no > 0 ? 6 : 0; // paddingAngle feel
  const greenLen = total > 0 ? (no / total) * C : 0;
  const redLen = total > 0 ? (yes / total) * C : 0;
  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={R} stroke="#f3f4f6" strokeWidth={sw} fill="none" />
        <G rotation={-90} origin={`${size / 2}, ${size / 2}`}>
          {no > 0 ? (
            <Circle cx={size / 2} cy={size / 2} r={R} stroke="#16a34a" strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={`${Math.max(0.001, greenLen - gap)} ${C}`} />
          ) : null}
          {yes > 0 ? (
            <Circle cx={size / 2} cy={size / 2} r={R} stroke="#b91c1c" strokeWidth={sw} fill="none" strokeLinecap="round" strokeDasharray={`${Math.max(0.001, redLen - gap)} ${C}`} strokeDashoffset={-greenLen} />
          ) : null}
        </G>
      </Svg>
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontSize: 20, fontWeight: "800", color: INK, letterSpacing: -0.3 }}>
          {yes}<Text style={{ color: GRAY_400, fontWeight: "400" }}>/</Text>{total}
        </Text>
        <Text style={{ fontSize: 8.5, fontWeight: "600", color: GRAY_400, letterSpacing: 1.8, marginTop: 3 }}>TESTER</Text>
      </View>
    </View>
  );
}

function CondBody({ stat }: { stat: PerQuestionStat }) {
  const [checkOpen, setCheckOpen] = useState(false);
  if (!stat.cond || stat.responses === 0) return <EmptyAnswerState />;
  const { yes, no, regsWithNotes } = stat.cond;
  const total = yes + no;
  const yesPct = total > 0 ? Math.round((yes / total) * 100) : 0;
  const noPct = total > 0 ? Math.round((no / total) * 100) : 0;

  return (
    <View style={{ gap: 10 }}>
      {/* Donut left + big editorial % right — tap donut opens the breakdown sheet */}
      <View className="flex-row items-center" style={{ gap: 16 }}>
        <Pressable onPress={() => setCheckOpen(true)} className="active:opacity-80">
          <CondDonut yes={yes} no={no} />
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ fontSize: 10, fontWeight: "600", color: GRAY_400, letterSpacing: 1.4 }}>อัตรารายงาน</Text>
          <Text style={{ fontSize: 38, fontWeight: "800", color: yes > 0 ? "#dc2626" : "#16a34a", lineHeight: 40, marginTop: 2 }}>
            {yesPct}<Text style={{ fontSize: 20, fontWeight: "700" }}>%</Text>
          </Text>
          <View className="flex-row items-center" style={{ gap: 10, marginTop: 8 }}>
            <View className="flex-row items-center" style={{ gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#16a34a" }} />
              <Text style={{ fontSize: 11, color: GRAY_500, fontWeight: "500" }}>{no} ไม่มี</Text>
            </View>
            <Text style={{ color: "#e5e7eb" }}>·</Text>
            <View className="flex-row items-center" style={{ gap: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: yes > 0 ? "#dc2626" : "#d1d5db" }} />
              <Text style={{ fontSize: 11, fontWeight: "600", color: yes > 0 ? "#b91c1c" : GRAY_400 }}>{yes} มี</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Ratio bar */}
      <View className="flex-row" style={{ height: 6, borderRadius: 999, overflow: "hidden", backgroundColor: GRAY_100 }}>
        <View style={{ width: `${noPct}%`, height: "100%", backgroundColor: "#16a34a" }} />
        <View style={{ width: `${yesPct}%`, height: "100%", backgroundColor: yes > 0 ? "#b91c1c" : "transparent" }} />
      </View>

      {/* CTA — ต้องตรวจสอบเพิ่มเติม (only when someone reported) */}
      {yes > 0 ? (
        <Pressable
          onPress={() => setCheckOpen(true)}
          className="flex-row items-center justify-between active:opacity-80"
          style={{ borderRadius: 12, backgroundColor: "#fef2f2", borderWidth: 1, borderColor: "#fecaca", paddingHorizontal: 12, paddingVertical: 9 }}
        >
          <View className="flex-row items-center" style={{ gap: 8 }}>
            <View style={{ width: 20, height: 20, borderRadius: 6, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" }}>
              <AlertTriangle size={12} color="#b91c1c" strokeWidth={2.6} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: "600", color: "#991b1b" }}>ต้องตรวจสอบเพิ่มเติม</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 6 }}>
            <View style={{ minWidth: 18, paddingHorizontal: 5, height: 18, borderRadius: 6, backgroundColor: "#dc2626", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontSize: 11, fontWeight: "800", color: "#fff" }}>{yes}</Text>
            </View>
            <ChevronRight size={14} color="#b91c1c" strokeWidth={2.4} />
          </View>
        </Pressable>
      ) : null}

      {/* ต้องตรวจสอบ modal — testers who reported symptoms */}
      <BottomSheet centerTitle visible={checkOpen} onClose={() => setCheckOpen(false)} title="รายการต้องตรวจสอบ" minHeightRatio={0.5} maxHeightRatio={0.8}>
        <View className="flex-row items-center" style={{ paddingHorizontal: 16, paddingTop: 2, paddingBottom: 8, gap: 14 }}>
          <View className="flex-row items-center" style={{ gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#dc2626" }} />
            <Text style={{ fontSize: 11.5, color: "#b91c1c", fontWeight: "600" }}>มีอาการ {yes} คน</Text>
          </View>
          <View className="flex-row items-center" style={{ gap: 5 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#16a34a" }} />
            <Text style={{ fontSize: 11.5, color: "#15803d", fontWeight: "600" }}>ไม่มีอาการ {no} คน</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24, gap: 10 }} showsVerticalScrollIndicator={false}>
          {regsWithNotes.length === 0 ? (
            <Text style={{ fontSize: 12, color: GRAY_400, fontStyle: "italic", textAlign: "center", paddingVertical: 24 }}>ยังไม่มีรายงาน</Text>
          ) : (
            regsWithNotes.map((x, i) => (
              <View key={`${x.reg.name}-${i}`} style={{ backgroundColor: SURFACE_GRAY, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
                <View className="flex-row items-center" style={{ gap: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
                  <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#dc2626" }} />
                  <Text style={{ fontSize: 12.5, fontWeight: "700", color: INK }}>{x.reg.name}</Text>
                </View>
                {x.note ? <Text style={{ fontSize: 11.5, color: GRAY_500, marginTop: 6, lineHeight: 16 }}>{x.note}</Text> : null}
              </View>
            ))
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}

function TextBody({ stat }: { stat: PerQuestionStat }) {
  if (!stat.text || stat.responses === 0) return <EmptyAnswerState />;
  const { samples } = stat.text;
  // mkt_price gets a min / median / max podium readout.
  if (stat.q.id === "mkt_price") {
    const amounts = samples.map((s) => Number(s.replace(/[^\d.]/g, ""))).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
    if (amounts.length > 0) {
      const lo = amounts[0];
      const hi = amounts[amounts.length - 1];
      const median = amounts[Math.floor(amounts.length / 2)];
      const pillars = [
        { label: "ต่ำสุด", value: `฿${lo}`, accent: "#e11d48", bg: "#FFE4E6" },
        { label: "กลาง", value: `฿${median}`, accent: "#059669", bg: "#D1FAE5" },
        { label: "สูงสุด", value: `฿${hi}`, accent: "#2563eb", bg: "#DBEAFE" },
      ];
      return (
        <View className="flex-row" style={{ gap: 8 }}>
          {pillars.map((p) => (
            <View key={p.label} style={{ flex: 1, backgroundColor: p.bg, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: "#101828" }}>{p.value}</Text>
              <Text style={{ fontSize: 10, color: "#101828", marginTop: 6 }}>{p.label}</Text>
            </View>
          ))}
        </View>
      );
    }
  }
  return (
    <View style={{ gap: 6 }}>
      {samples.slice(0, 4).map((t, i) => (
        <View key={i} style={{ backgroundColor: "rgba(249,250,251,0.7)", borderRadius: 6, borderWidth: 1, borderColor: DIVIDER_GRAY, paddingHorizontal: 10, paddingVertical: 8 }}>
          <Text style={{ fontSize: 11.5, color: "#374151", fontStyle: "italic", lineHeight: 17 }}>"{t}"</Text>
        </View>
      ))}
      {samples.length > 4 ? (
        <Text style={{ fontSize: 10.5, color: GRAY_400, textAlign: "center" }}>+{samples.length - 4} คำตอบเพิ่มเติม</Text>
      ) : null}
    </View>
  );
}

function AbBody({ stat }: { stat: PerQuestionStat }) {
  if (!stat.ab || stat.responses === 0) return <EmptyAnswerState />;
  const { a, b, aPct, bPct, winner, gap } = stat.ab;
  return (
    <View style={{ gap: 12 }}>
      <View className="flex-row" style={{ gap: 16 }}>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: "#3b82f6" }}>{aPct}%</Text>
          <Text style={{ fontSize: 11, color: GRAY_500, fontWeight: "500", marginTop: 6 }}>สูตร A · {a} คน</Text>
        </View>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={{ fontSize: 28, fontWeight: "800", color: GREEN }}>{bPct}%</Text>
          <Text style={{ fontSize: 11, color: GRAY_500, fontWeight: "500", marginTop: 6 }}>สูตร B · {b} คน</Text>
        </View>
      </View>
      <View className="flex-row" style={{ gap: 16 }}>
        <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: "#3b82f6" }} />
        <View style={{ flex: 1, height: 8, borderRadius: 999, backgroundColor: GREEN }} />
      </View>
      {winner ? (
        <View className="flex-row items-center justify-center" style={{ paddingTop: 4 }}>
          <View style={{ paddingHorizontal: 12, paddingVertical: 4, borderRadius: 999, backgroundColor: "#F3F4F6" }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: INK }}>สูตร {winner} ชนะ +{gap}%</Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function QuestionCardBody({ stat, accentColor }: { stat: PerQuestionStat; accentColor: string }) {
  switch (stat.kind) {
    case "scale": return <ScaleBody stat={stat} accentColor={accentColor} />;
    case "nps": return <NpsBody stat={stat} />;
    case "mc": return <McBody stat={stat} accentColor={accentColor} />;
    case "tag": return <TagBody stat={stat} accentColor={accentColor} />;
    case "cond": return <CondBody stat={stat} />;
    case "text": return <TextBody stat={stat} />;
    case "ab": return <AbBody stat={stat} />;
    default: return null;
  }
}

/** Expanded detail body shown in a leftSideExtras card's tap-sheet — adds the
 *  full reporter list (cond) / every price answer (mkt_price) / all responses. */
function ExtraDetailBody({ stat, accent }: { stat: PerQuestionStat; accent: string }) {
  if (stat.kind === "cond" && stat.cond) {
    const { yes, regsWithNotes } = stat.cond;
    return (
      <View>
        <CondBody stat={stat} />
        <SheetSubhead>{`ผู้รายงานอาการ (${yes})`}</SheetSubhead>
        {regsWithNotes.length > 0 ? (
          regsWithNotes.map((x, i) => (
            <View key={`${x.reg.name}-${i}`} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: GRAY_100 }}>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: INK }}>{x.reg.name}</Text>
              {x.note ? <Text style={{ fontSize: 11.5, color: GRAY_500, marginTop: 2, lineHeight: 16 }}>{x.note}</Text> : null}
            </View>
          ))
        ) : (
          <Text style={{ fontSize: 12, color: GRAY_400, fontStyle: "italic", paddingTop: 6 }}>ไม่มีผู้รายงานอาการ</Text>
        )}
      </View>
    );
  }
  if (stat.kind === "text" && stat.text) {
    const { samples } = stat.text;
    let header: React.ReactNode = null;
    if (stat.q.id === "mkt_price") {
      const amounts = samples.map((s) => Number(s.replace(/[^\d.]/g, ""))).filter((n) => !isNaN(n) && n > 0).sort((a, b) => a - b);
      if (amounts.length > 0) {
        const lo = amounts[0];
        const hi = amounts[amounts.length - 1];
        const median = amounts[Math.floor(amounts.length / 2)];
        const pillars = [
          { label: "ต่ำสุด", value: lo, bg: "#FFE4E6" },
          { label: "กลาง", value: median, bg: "#D1FAE5" },
          { label: "สูงสุด", value: hi, bg: "#DBEAFE" },
        ];
        header = (
          <View className="flex-row" style={{ gap: 8 }}>
            {pillars.map((p) => (
              <View key={p.label} style={{ flex: 1, backgroundColor: p.bg, borderRadius: 12, paddingVertical: 14, alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: "#101828" }}>฿{p.value}</Text>
                <Text style={{ fontSize: 10, color: "#101828", marginTop: 6 }}>{p.label}</Text>
              </View>
            ))}
          </View>
        );
      }
    }
    return (
      <View>
        {header}
        <SheetSubhead>{`คำตอบทั้งหมด (${samples.length})`}</SheetSubhead>
        {samples.map((t, i) => (
          <View key={i} style={{ backgroundColor: "rgba(249,250,251,0.7)", borderRadius: 8, borderWidth: 1, borderColor: DIVIDER_GRAY, paddingHorizontal: 10, paddingVertical: 8, marginTop: 6 }}>
            <Text style={{ fontSize: 12, color: "#374151", lineHeight: 17 }}>{stat.q.id === "mkt_price" ? t : `"${t}"`}</Text>
          </View>
        ))}
      </View>
    );
  }
  // mc / tag / scale / etc → the full chart body.
  return <QuestionCardBody stat={stat} accentColor={accent} />;
}

/** A leftSideExtras card — taps open a BottomSheet with the full breakdown. */
function LeftExtraCard({ stat }: { stat: PerQuestionStat }) {
  const recipe = PHASE_RECIPE[stat.q.phase];
  const desc = leftExtraDescription(stat);
  const [open, setOpen] = useState(false);

  // The conditional (ผลข้างเคียง) card carries its own donut + "ต้องตรวจสอบ" CTA
  // → render as a plain card, no whole-card sheet (avoids a duplicate sheet).
  if (stat.kind === "cond") {
    return (
      <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 18 }}>
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: INK, lineHeight: 21 }}>{stat.q.label}</Text>
          {desc ? <Text style={{ fontSize: 11, color: GRAY_500, marginTop: 2, lineHeight: 16 }}>{desc}</Text> : null}
        </View>
        <QuestionCardBody stat={stat} accentColor={recipe.color} />
      </View>
    );
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} className="active:opacity-90" style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 18 }}>
        <View style={{ marginBottom: 16 }}>
          <View className="flex-row items-start" style={{ gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 16, fontWeight: "700", color: INK, lineHeight: 21 }}>{stat.q.label}</Text>
            <ChevronRight size={16} color={GRAY_400} />
          </View>
          {desc ? <Text style={{ fontSize: 11, color: GRAY_500, marginTop: 2, lineHeight: 16 }}>{desc}</Text> : null}
        </View>
        <QuestionCardBody stat={stat} accentColor={recipe.color} />
      </Pressable>
      <BottomSheet centerTitle visible={open} onClose={() => setOpen(false)} title={stat.q.label} minHeightRatio={0.45} maxHeightRatio={0.8}>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
          <ExtraDetailBody stat={stat} accent={recipe.color} />
        </ScrollView>
      </BottomSheet>
    </>
  );
}

/** AB "สูตร" card — taps open a sheet listing who chose สูตร A vs สูตร B. */
function AbChoiceCard({ stat }: { stat: PerQuestionStat }) {
  const [open, setOpen] = useState(false);
  const ab = stat.ab;
  const VoterList = ({ regs, color }: { regs: Registration[]; color: string }) =>
    regs.length === 0 ? (
      <Text style={{ fontSize: 11.5, color: GRAY_400, fontStyle: "italic", paddingVertical: 4 }}>ไม่มีผู้เลือก</Text>
    ) : (
      <View style={{ gap: 6 }}>
        {regs.map((r, i) => (
          <View key={`${r.name}-${i}`} className="flex-row items-center" style={{ gap: 7, paddingVertical: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: color }} />
            <Text style={{ fontSize: 12.5, color: INK }}>{r.name}</Text>
          </View>
        ))}
      </View>
    );
  return (
    <View style={{ marginBottom: 18 }}>
      <Pressable onPress={() => setOpen(true)} className="active:opacity-90">
        <View className="flex-row items-start" style={{ marginBottom: 16, gap: 8 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: INK }}>สูตร</Text>
            <Text style={{ fontSize: 11, color: GRAY_500, marginTop: 2 }}>เปรียบเทียบสูตร A กับ B</Text>
          </View>
          <ChevronRight size={16} color={GRAY_400} />
        </View>
        <QuestionCardBody stat={stat} accentColor="#8b5cf6" />
      </Pressable>
      <BottomSheet centerTitle visible={open} onClose={() => setOpen(false)} title="สูตร A กับ B" minHeightRatio={0.5} maxHeightRatio={0.8}>
        {ab ? (
          <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
            <View className="flex-row" style={{ gap: 12, paddingTop: 2, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: GRAY_100 }}>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: "#3b82f6" }}>{ab.aPct}%</Text>
                <Text style={{ fontSize: 11, color: GRAY_500, marginTop: 4 }}>สูตร A · {ab.a} คน</Text>
              </View>
              <View style={{ flex: 1, alignItems: "center" }}>
                <Text style={{ fontSize: 24, fontWeight: "800", color: GREEN }}>{ab.bPct}%</Text>
                <Text style={{ fontSize: 11, color: GRAY_500, marginTop: 4 }}>สูตร B · {ab.b} คน</Text>
              </View>
            </View>
            <SheetSubhead>{`เลือกสูตร A (${ab.a})`}</SheetSubhead>
            <VoterList regs={ab.aRegs} color="#3b82f6" />
            <SheetSubhead>{`เลือกสูตร B (${ab.b})`}</SheetSubhead>
            <VoterList regs={ab.bRegs} color={GREEN} />
          </ScrollView>
        ) : null}
      </BottomSheet>
    </View>
  );
}

/* ============================================================================
 *  Report layout — ภาพรวมการประเมิน (rating cards) + AB sidebar + leftSideExtras
 *  ========================================================================== */

/** Per-card description for the leftSideExtras (ผลข้างเคียง / ราคา / First
 *  Impression / กลุ่มเป้าหมาย) — ported verbatim from web L5302-5311. */
function leftExtraDescription(stat: PerQuestionStat): string | null {
  if (stat.kind === "cond") return `Tester ${stat.cond?.yes ?? 0} คน รายงานอาการระหว่างทดสอบ`;
  if (stat.q.id === "mkt_price") return "ราคาที่ Tester พร้อมจ่ายสำหรับสินค้านี้";
  if (stat.q.id === "pkg_first") return "ภาพแรกของบรรจุภัณฑ์ที่ Tester รู้สึก";
  if (stat.q.id === "mkt_target") return "กลุ่มเป้าหมายที่ Tester มองว่าเหมาะสม";
  return null;
}

/** Inner rating tile — sits inside the white "ภาพรวมการประเมิน" card. */
function RatingTile({ stat }: { stat: PerQuestionStat }) {
  const recipe = PHASE_RECIPE[stat.q.phase];
  return (
    <View style={{ borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 14 }}>
      <Text style={{ fontSize: 13, fontWeight: "600", color: INK, lineHeight: 18, marginBottom: 12 }}>{stat.q.label}</Text>
      <QuestionCardBody stat={stat} accentColor={recipe.color} />
    </View>
  );
}

/** Plain white outer card with a 16px title + 11px subtitle (Figma report card). */
function ReportCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 18 }}>
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: INK, lineHeight: 21 }}>{title}</Text>
        {subtitle ? <Text style={{ fontSize: 11, color: GRAY_500, marginTop: 2, lineHeight: 16 }}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** One gray comment / ab_diff row — avatar + name (+ optional star/choice badge)
 *  over a divider, then a 2-line body. Used inline and in the BottomSheets. */
function PersonRow({
  reg,
  body,
  stars,
  choice,
  clamp = 2,
}: {
  reg: Registration;
  body?: string;
  stars?: number;
  choice?: "A" | "B";
  clamp?: number;
}) {
  const choiceColor = choice === "A" ? "#3b82f6" : choice === "B" ? GREEN : GRAY_400;
  return (
    <View style={{ backgroundColor: SURFACE_GRAY, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 }}>
      <View className="flex-row items-center" style={{ gap: 8, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "rgba(229,231,235,0.7)" }}>
        <Avatar name={reg.name} gender={reg.gender} />
        <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, fontWeight: "600", color: INK }}>{reg.name}</Text>
        {stars && stars > 0 ? (
          <View className="flex-row items-center" style={{ gap: 2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999, backgroundColor: "#fffbeb" }}>
            <Star size={10} color={STAR_YELLOW} fill={STAR_YELLOW} strokeWidth={0} />
            <Text style={{ fontSize: 10, fontWeight: "700", color: AMBER_DARK }}>{stars}/5</Text>
          </View>
        ) : null}
        {choice ? (
          <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, backgroundColor: `${choiceColor}15` }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: choiceColor }}>ชอบสูตร {choice}</Text>
          </View>
        ) : null}
      </View>
      <Text numberOfLines={clamp} style={{ fontSize: 11.5, color: GRAY_500, lineHeight: 17, marginTop: 8 }}>{body}</Text>
    </View>
  );
}

/** "ดูเพิ่มเติม" pill — opens a BottomSheet. */
function MoreButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <View className="flex-row justify-center" style={{ paddingTop: 12 }}>
      <Pressable
        onPress={onPress}
        hitSlop={6}
        className="active:opacity-70 flex-row items-center"
        style={{ gap: 2, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: SURFACE_GRAY, borderWidth: 1, borderColor: "#e5e7eb" }}
      >
        <Text style={{ fontSize: 11, fontWeight: "600", color: "#374151" }}>{label}</Text>
        <ChevronRight size={13} color="#374151" strokeWidth={2.4} />
      </Pressable>
    </View>
  );
}

/* ============================================================================
 *  Main component
 *  ========================================================================== */

export function TrialDetailOverview({ product }: { product: TrialProduct }) {
  const applicants = useMemo(
    () => getRegistrationsForTrial(product.id, product.category),
    [product.id, product.category],
  );
  const evaluated = useMemo(() => applicants.filter((r) => !!r.evaluatedAt), [applicants]);

  const genderStats = useMemo(() => {
    const counts: Record<string, number> = { male: 0, female: 0, lgbtq: 0, unknown: 0 };
    applicants.forEach((r) => {
      const g = r.gender || "unknown";
      counts[g] = (counts[g] || 0) + 1;
    });
    return counts;
  }, [applicants]);

  const ageStats = useMemo(() => {
    const counts: Record<string, number> = {};
    AGE_RANGES.forEach((r) => { counts[r] = 0; });
    let unknown = 0;
    applicants.forEach((r) => {
      if (r.ageRange && AGE_RANGES.includes(r.ageRange)) counts[r.ageRange]++;
      else unknown++;
    });
    return { counts, unknown };
  }, [applicants]);

  // Per-question stats — reproduce the web grid. The mobile TrialProduct has no
  // testObjectives/activePhases, so use the DEFAULT_OBJECTIVES every web eval
  // config shares (efficacy/packaging/market/formula_ab) + the product category;
  // phases default to baseline + after_full (configs carry no evaluationDays).
  const perQuestionStats = useMemo<PerQuestionStat[]>(() => {
    const phases: Exclude<Phase, "always">[] = ["baseline", "after_full"];
    const raw: EvalQuestion[] = generateEvalQuestions(DEFAULT_OBJECTIVES, product.category);
    const questions = raw.filter((q) =>
      q.phase !== "first_use"
      && q.id !== "core_overall"
      && q.id !== "core_nps"
      && q.id !== "core_text"
      && (q.phase === "always" || phases.includes(q.phase as Exclude<Phase, "always">))
    );
    return questions.map((q) => computeQuestionStat(q, evaluated));
  }, [evaluated, product.category]);

  /** Modal toggles for the "ดูเพิ่มเติม" buttons (web abDiffModalOpen / commentsModalOpen). */
  const [abDiffModalOpen, setAbDiffModalOpen] = useState(false);
  const [commentsModalOpen, setCommentsModalOpen] = useState(false);

  // ===== Report buckets — mirror web L5199-5249. Rating cards (kind "scale")
  // group by phase; ab_prefer / ab_diff feed the AB sidebar card; conditional +
  // mkt_price / pkg_first / mkt_target become the leftSideExtras; everything else
  // stacks under the AB card. =====
  const report = useMemo(() => {
    const ratingByPhase: Record<Phase, PerQuestionStat[]> = { baseline: [], first_use: [], after_full: [], always: [] };
    let abChoiceCard: PerQuestionStat | null = null;
    let abDiffCard: PerQuestionStat | null = null;
    const otherCards: PerQuestionStat[] = [];
    for (const stat of perQuestionStats) {
      if (stat.kind === "scale") ratingByPhase[stat.q.phase].push(stat);
      else if (stat.q.id === "ab_prefer") abChoiceCard = stat;
      else if (stat.q.id === "ab_diff") abDiffCard = stat;
      else otherCards.push(stat);
    }
    const ratingPhases = (["baseline", "first_use", "after_full"] as Phase[]).filter((ph) => ratingByPhase[ph].length > 0);
    // leftSideExtras — conditional (ผลข้างเคียง) + mkt_price / pkg_first / mkt_target.
    const LEFT_PRIORITY: Record<string, number> = { pkg_first: 1, mkt_target: 2, mkt_price: 3 };
    const LEFT_IDS = new Set(["mkt_price", "pkg_first", "mkt_target"]);
    const leftSideExtras = otherCards
      .filter((c) => c.kind === "cond" || LEFT_IDS.has(c.q.id))
      .sort((a, b) => {
        const ka = a.kind === "cond" ? 0 : (LEFT_PRIORITY[a.q.id] ?? 99);
        const kb = b.kind === "cond" ? 0 : (LEFT_PRIORITY[b.q.id] ?? 99);
        return ka - kb;
      });
    const otherCardsForZone2 = otherCards.filter((c) => !(c.kind === "cond" || LEFT_IDS.has(c.q.id)));
    return { ratingByPhase, ratingPhases, abChoiceCard, abDiffCard, leftSideExtras, otherCardsForZone2 };
  }, [perQuestionStats]);

  const hasRatings = report.ratingPhases.length > 0;
  const hasAb = !!report.abChoiceCard || !!report.abDiffCard;

  // ab_diff comment list (ความแตกต่าง) — web L5344-5351.
  const diffEntries = useMemo(() => {
    if (!report.abDiffCard) return [] as { reg: Registration; note: string }[];
    return evaluated
      .map((r) => ({ reg: r, note: (r.evaluation?.textAnswers?.["ab_diff"] ?? "").trim() }))
      .filter((x): x is { reg: Registration; note: string } => !!x.note);
  }, [evaluated, report.abDiffCard]);

  // ab_prefer choice per applicant (for the ความแตกต่าง modal badge).
  const abChoiceByKey = useMemo(() => {
    const m: Record<string, "A" | "B" | undefined> = {};
    evaluated.forEach((r) => { m[`${r.name}-${r.submittedAt}`] = r.evaluation?.abChoices?.["ab_prefer"]; });
    return m;
  }, [evaluated]);

  // คำแนะนำเพิ่มเติม comments — web L5453.
  const commentedEvals = useMemo(
    () => evaluated.filter((r) => r.evaluation?.comment && r.evaluation.comment.trim().length > 0),
    [evaluated],
  );

  const VISIBLE = 4;

  return (
    <View style={{ gap: 14 }}>
      {/* Demographics */}
      <GenderSection applicants={applicants} genderStats={genderStats} />
      <AgeSection applicants={applicants} ageStats={ageStats} />

      {evaluated.length === 0 ? (
        <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 2, borderStyle: "dashed", borderColor: "#e5e7eb", padding: 32, alignItems: "center" }}>
          <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: "#f9fafb", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
            <BarChart3 size={28} color="#d1d5db" strokeWidth={1.5} />
          </View>
          <Text style={{ fontSize: 13, fontWeight: "600", color: GRAY_500 }}>ยังไม่มีผลประเมินจาก Tester</Text>
          <Text style={{ fontSize: 11.5, color: GRAY_400, marginTop: 4, textAlign: "center", maxWidth: 300 }}>
            เมื่อ Tester ส่งแบบประเมินเข้ามา ระบบจะวิเคราะห์คำตอบรายข้อให้ที่นี่
          </Text>
        </View>
      ) : (
        <>
          {/* Headline metrics */}
          <SatisfactionSection evaluated={evaluated} />
          <NpsSection evaluated={evaluated} />

          {/* ===== Report layout — ภาพรวมการประเมิน + leftSideExtras, then AB
              sidebar stacked below (1-col on phone) ===== */}
          {(hasRatings || report.leftSideExtras.length > 0) && (
            <>
              {/* ภาพรวมการประเมิน — white outer card holding the phase rating tiles. */}
              {hasRatings && (
                <ReportCard
                  title="ภาพรวมการประเมิน"
                  subtitle="คะแนน 1-5 ของแต่ละข้อ — แยกตามช่วงเวลาที่ Tester ตอบ"
                >
                  <View style={{ gap: 18 }}>
                    {report.ratingPhases.map((ph) => {
                      const recipe = PHASE_RECIPE[ph];
                      const cleanLabel = recipe.label.replace(/\s*\([^)]*\)\s*$/, "");
                      return (
                        <View key={ph} style={{ gap: 10 }}>
                          <Text style={{ fontSize: 14, fontWeight: "600", color: INK }}>{cleanLabel}</Text>
                          <View style={{ gap: 10 }}>
                            {report.ratingByPhase[ph].map((stat) => (
                              <RatingTile key={stat.q.id} stat={stat} />
                            ))}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                </ReportCard>
              )}

              {/* leftSideExtras — ผลข้างเคียง / First Impression / กลุ่มเป้าหมาย / ราคา,
                  each its own white card with a per-card description subtitle. */}
              {report.leftSideExtras.map((stat) => (
                <LeftExtraCard key={stat.q.id} stat={stat} />
              ))}
            </>
          )}

          {/* ===== AB sidebar — สูตร + ความแตกต่าง inside one shared card (stacked
              below the report on phone). ===== */}
          {hasAb && (
            <View style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 18 }}>
              {/* ===== สูตร ===== */}
              {report.abChoiceCard ? <AbChoiceCard stat={report.abChoiceCard} /> : null}
              {/* Divider between sections */}
              {report.abChoiceCard && report.abDiffCard ? (
                <View style={{ height: 1, backgroundColor: GRAY_100, marginHorizontal: -18, marginBottom: 18 }} />
              ) : null}
              {/* ===== ความแตกต่าง ===== */}
              {report.abDiffCard ? (
                <View>
                  <View style={{ marginBottom: 16 }}>
                    <Text style={{ fontSize: 16, fontWeight: "700", color: INK }}>ความแตกต่าง</Text>
                    <Text style={{ fontSize: 11, color: GRAY_500, marginTop: 2 }}>สิ่งที่ Tester สังเกตได้ระหว่างสูตร A กับ B</Text>
                  </View>
                  {diffEntries.length === 0 ? (
                    <Text style={{ fontSize: 11.5, color: GRAY_400, fontStyle: "italic", textAlign: "center", paddingVertical: 16 }}>ยังไม่มีคำตอบ</Text>
                  ) : (
                    <>
                      <View style={{ gap: 10 }}>
                        {diffEntries.slice(0, VISIBLE).map(({ reg, note }) => (
                          <PersonRow key={`${reg.name}-${reg.submittedAt}`} reg={reg} body={note} />
                        ))}
                      </View>
                      {diffEntries.length > VISIBLE ? (
                        <MoreButton label={`+${diffEntries.length - VISIBLE} คำตอบเพิ่มเติม`} onPress={() => setAbDiffModalOpen(true)} />
                      ) : null}
                    </>
                  )}
                </View>
              ) : null}
            </View>
          )}

          {/* ===== Remaining other-type cards (MC / tag / text) ===== */}
          {report.otherCardsForZone2.map((stat) => {
            const recipe = PHASE_RECIPE[stat.q.phase];
            return (
              <View key={stat.q.id} style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: DIVIDER_GRAY, padding: 18 }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: INK, lineHeight: 20, marginBottom: 12 }}>{stat.q.label}</Text>
                <QuestionCardBody stat={stat} accentColor={recipe.color} />
              </View>
            );
          })}

          {/* ===== คำแนะนำเพิ่มเติม ===== */}
          {commentedEvals.length > 0 ? (
            <SectionCard title="คำแนะนำเพิ่มเติม" subtitle="เสียงจริงจาก Tester ที่ทดสอบสินค้า">
              <View style={{ gap: 10 }}>
                {commentedEvals.slice(0, VISIBLE).map((r) => (
                  <PersonRow key={`${r.name}-${r.submittedAt}`} reg={r} body={r.evaluation?.comment} stars={r.evaluation?.overall || 0} />
                ))}
              </View>
              {commentedEvals.length > VISIBLE ? (
                <MoreButton label={`+${commentedEvals.length - VISIBLE} คำตอบเพิ่มเติม`} onPress={() => setCommentsModalOpen(true)} />
              ) : null}
            </SectionCard>
          ) : null}
        </>
      )}

      {/* ===== ความแตกต่างทั้งหมด — BottomSheet listing every ab_diff answer ===== */}
      <BottomSheet
        centerTitle
        visible={abDiffModalOpen}
        onClose={() => setAbDiffModalOpen(false)}
        title={`ความแตกต่างทั้งหมด · ${diffEntries.length} คำตอบ`}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 10 }}>
          <Text style={{ fontSize: 11, color: GRAY_500, marginBottom: 4 }}>สิ่งที่ Tester สังเกตได้ระหว่างสูตร A กับ B</Text>
          {diffEntries.length === 0 ? (
            <Text style={{ fontSize: 12, color: GRAY_400, fontStyle: "italic", textAlign: "center", paddingVertical: 24 }}>ยังไม่มีคำตอบ</Text>
          ) : (
            diffEntries.map(({ reg, note }) => (
              <PersonRow
                key={`${reg.name}-${reg.submittedAt}`}
                reg={reg}
                body={note}
                choice={abChoiceByKey[`${reg.name}-${reg.submittedAt}`]}
                clamp={6}
              />
            ))
          )}
        </ScrollView>
      </BottomSheet>

      {/* ===== คำแนะนำเพิ่มเติมทั้งหมด — BottomSheet listing every comment ===== */}
      <BottomSheet
        centerTitle
        visible={commentsModalOpen}
        onClose={() => setCommentsModalOpen(false)}
        title={`คำแนะนำเพิ่มเติมทั้งหมด · ${commentedEvals.length} ความคิดเห็น`}
      >
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 24, gap: 10 }}>
          <Text style={{ fontSize: 11, color: GRAY_500, marginBottom: 4 }}>เสียงจริงจาก Tester ที่ทดสอบสินค้า</Text>
          {commentedEvals.length === 0 ? (
            <Text style={{ fontSize: 12, color: GRAY_400, fontStyle: "italic", textAlign: "center", paddingVertical: 24 }}>ยังไม่มีความคิดเห็น</Text>
          ) : (
            commentedEvals.map((r) => (
              <PersonRow key={`${r.name}-${r.submittedAt}`} reg={r} body={r.evaluation?.comment} stars={r.evaluation?.overall || 0} clamp={6} />
            ))
          )}
        </ScrollView>
      </BottomSheet>
    </View>
  );
}
