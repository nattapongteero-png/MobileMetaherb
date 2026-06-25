import { useMemo, useState } from "react";
import { View, Text, Image, Pressable, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  FlaskConical,
  Clock,
  Check,
  MapPin,
  ChevronRight,
  FileText,
  Calendar,
  Truck,
  ClipboardCheck,
  Store,
  XCircle,
  Coins,
  type LucideIcon,
} from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import { StatusBar } from "expo-status-bar";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { SubPageHeader } from "../components/SubPageHeader";
import { PressableScale } from "../components/PressableScale";
import { BottomFade } from "../components/BottomFade";

// Trial data comes from the canonical TrialProductsScreen list (local photos)
// so each registration row matches the card/detail the user joined.
import { TRIAL_PRODUCTS, TrialProduct } from "./TrialProductsScreen";
import {
  STAGE_META,
  nextEval,
  fmtTrialDate as fmtDate,
  type TrialStage,
  type TrialRegistration as Registration,
} from "../data/trialRegistrations";
import { useTrials } from "../context/TrialContext";

/** Resolve a local bundled image (require → number) or remote URL string. */
function imgSource(src: number | string | undefined): any {
  return typeof src === "number" ? src : { uri: src };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

type TabKey = TrialStage | "all";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "pending_approval", label: "รออนุมัติ" },
  { key: "shipping", label: "กำลังจัดส่ง" },
  { key: "testing", label: "กำลังทดลอง" },
  { key: "completed", label: "เสร็จสิ้น" },
  { key: "rejected", label: "ถูกปฏิเสธ" },
];

type Enriched = { reg: Registration; product: TrialProduct };

// ── Small presentational pieces (module scope) ─────────────────────────────────

// Glass filter chips in the header — identical language to the orders /
// notification filter bars (Jakob's Law: filter bars look the same everywhere).
function TrialTabs({
  tab,
  setTab,
  countFor,
}: {
  tab: TabKey;
  setTab: (t: TabKey) => void;
  countFor: (k: TabKey) => number;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
      {TABS.map((tb) => {
        const active = tab === tb.key;
        const count = countFor(tb.key);
        return (
          <PressableScale key={tb.key} onPress={() => setTab(tb.key)} scaleTo={0.92}>
            <GlassView
              glassEffectStyle="regular"
              colorScheme="light"
              tintColor={active ? "rgba(49,151,84,0.22)" : "rgba(255,255,255,0.5)"}
              isInteractive
              style={{
                height: 34,
                paddingHorizontal: 16,
                borderRadius: 999,
                overflow: "hidden",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                borderWidth: 1,
                borderColor: active ? "rgba(49,151,84,0.45)" : "rgba(0,0,0,0.06)",
              }}
            >
              <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? BRAND_GREEN_DARK : "#374151" }}>{tb.label}</Text>
              {count > 0 ? (
                <View style={{ minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: active ? "rgba(38,122,67,0.16)" : "rgba(0,0,0,0.07)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: active ? BRAND_GREEN_DARK : "#374151", lineHeight: 13 }}>{count}</Text>
                </View>
              ) : null}
            </GlassView>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

function MetaRow({ Icon, color, children }: { Icon: LucideIcon; color: string; children: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Icon size={12} strokeWidth={2.3} color={color} />
      <Text style={{ fontSize: 12, color, fontWeight: "500" }} numberOfLines={1}>{children}</Text>
    </View>
  );
}

// Outline / filled pill action button.
function ActionButton({ label, Icon, fill, onPress }: { label: string; Icon?: LucideIcon; fill?: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-80"
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 40,
        borderRadius: 999,
        backgroundColor: fill ? BRAND_GREEN : "transparent",
        borderWidth: fill ? 0 : 1,
        borderColor: "#e5e7eb",
      }}
    >
      {Icon ? <Icon size={14} strokeWidth={2.4} color={fill ? "#fff" : BRAND_GREEN} /> : null}
      <Text style={{ fontSize: 13, fontWeight: "600", color: fill ? "#fff" : BRAND_GREEN }}>{label}</Text>
    </Pressable>
  );
}

function TrialItemCard({
  product,
  registration,
  onView,
  onEvaluate,
}: {
  product: TrialProduct;
  registration: Registration;
  onView: () => void;
  onEvaluate: (kind: "pre" | "post") => void;
}) {
  const stage = STAGE_META[registration.stage];
  const evalKind = nextEval(registration);

  // Stage-specific hint line.
  const note = (() => {
    switch (registration.stage) {
      case "pending_approval":
        return { Icon: Clock, color: "#b45309", text: "ร้านค้ากำลังพิจารณาใบสมัคร โดยทั่วไป 1–2 วันทำการ" };
      case "rejected":
        return { Icon: XCircle, color: "#dc2626", text: registration.rejectReason ?? "คำขอถูกปฏิเสธจากร้านค้า" };
      case "shipping":
        return { Icon: Truck, color: "#0369a1", text: "อนุมัติแล้ว — ร้านกำลังจัดส่งสินค้าให้คุณ" };
      case "testing":
        return evalKind === "pre"
          ? { Icon: ClipboardCheck, color: "#b45309", text: "กรุณาทำแบบประเมินก่อนใช้ ก่อนเริ่มทดลองใช้งาน" }
          : { Icon: FileText, color: "#b45309", text: "ทดลองใช้แล้วอย่าลืมทำแบบประเมินหลังใช้ภายใน 30 วัน" };
      case "completed":
        return { Icon: Coins, color: BRAND_GREEN_DARK, text: `ได้รับ ${product.rewardPoints.toLocaleString()} คะแนนแล้ว — ขอบคุณที่ร่วมทดสอบ` };
    }
  })();

  return (
    <Pressable onPress={onView} className="active:opacity-90" style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16, gap: 12 }}>
      {/* Shop logo + name + stage badge */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
            <Store size={14} color="#fff" strokeWidth={2.4} />
          </View>
          <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>
            {product.studioName ?? "METAHERB Store"}
          </Text>
        </View>
        <View style={{ backgroundColor: stage.bg, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: stage.tint }}>{stage.label}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 14 }}>
        <Image
          source={imgSource(product.imageSrc ?? product.image)}
          style={{ width: 96, height: 96, borderRadius: 12, backgroundColor: "#f3f4f6" }}
        />

        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: "600", color: "#1a1a1a" }} numberOfLines={2}>{product.name}</Text>

          <View style={{ gap: 4, marginTop: 1 }}>
            <MetaRow Icon={Calendar} color={TEXT_MUTED}>{`สมัคร ${fmtDate(registration.submittedAt)}`}</MetaRow>
            {registration.trackingNumber ? (
              <MetaRow Icon={Truck} color={TEXT_MUTED}>{`เลขพัสดุ ${registration.trackingNumber}`}</MetaRow>
            ) : null}
            {/* Survey progress — only meaningful once testing has started */}
            {(registration.stage === "testing" || registration.stage === "completed") && registration.hasPreEval ? (
              <MetaRow Icon={Check} color={registration.preEvalDone ? BRAND_GREEN : TEXT_MUTED}>
                {`แบบประเมินก่อนใช้ ${registration.preEvalDone ? "เสร็จแล้ว" : "ยังไม่ทำ"}`}
              </MetaRow>
            ) : null}
            {registration.stage === "testing" || registration.stage === "completed" ? (
              <MetaRow Icon={registration.postEvalDone ? Check : FileText} color={registration.postEvalDone ? BRAND_GREEN : TEXT_MUTED}>
                {`แบบประเมินหลังใช้ ${registration.postEvalDone ? "เสร็จแล้ว" : "ยังไม่ทำ"}`}
              </MetaRow>
            ) : null}
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 1 }}>
            <MapPin size={12} strokeWidth={2.2} color={TEXT_MUTED} style={{ marginTop: 1 }} />
            <Text style={{ fontSize: 12, color: TEXT_MUTED, flex: 1 }} numberOfLines={1}>{registration.address}</Text>
          </View>
        </View>
      </View>

      {/* Stage hint */}
      {note ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <note.Icon size={13} strokeWidth={2.4} color={note.color} />
          <Text style={{ fontSize: 12, color: note.color, fontWeight: "500", flex: 1, lineHeight: 17 }}>{note.text}</Text>
        </View>
      ) : null}

      {/* Tapping the card opens the request detail — only the evaluation step
          keeps its own button (it does NOT lead to the detail page). */}
      {registration.stage === "testing" ? (
        <ActionButton
          label={evalKind === "pre" ? "ทำแบบประเมินก่อนใช้" : "ทำแบบประเมินหลังใช้"}
          Icon={evalKind === "pre" ? ClipboardCheck : FileText}
          fill
          onPress={() => onEvaluate(evalKind === "pre" ? "pre" : "post")}
        />
      ) : null}
    </Pressable>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────

export function MyTrialsScreen() {
  const nav = useNavigation();
  const { registrations } = useTrials();
  const [tab, setTab] = useState<TabKey>("all");

  const enriched = useMemo<Enriched[]>(
    () =>
      registrations.map((reg) => ({
        reg,
        product: TRIAL_PRODUCTS.find((p) => p.id === reg.trialId),
      })).filter((x): x is Enriched => !!x.product),
    [registrations]
  );

  const list = tab === "all" ? enriched : enriched.filter((x) => x.reg.stage === tab);
  const countFor = (k: TabKey) =>
    k === "all" ? enriched.length : enriched.filter((x) => x.reg.stage === k).length;

  const goToTrials = () => (nav.navigate as (route: string, params?: object) => void)("TrialProducts");
  // Card tap → the registration (join request) detail, NOT the product page.
  const openDetail = (regId: string) => (nav.navigate as (route: string, params?: object) => void)("TrialRequestDetail", { id: regId });
  const openEval = (regId: string, kind: "pre" | "post") =>
    (nav.navigate as (route: string, params?: object) => void)("TrialEval", { id: regId, kind });

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="การทดลองของฉัน"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        bottomSlot={<TrialTabs tab={tab} setTab={setTab} countFor={countFor} />}
      />
      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
        >
          {list.length === 0 ? (
            <View style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 32, alignItems: "center" }}>
              <View style={{ width: 56, height: 56, borderRadius: 999, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
                <FlaskConical size={24} strokeWidth={2.2} color="#9ca3af" />
              </View>
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#4b5563", marginBottom: 4 }}>ยังไม่มีรายการในหมวดนี้</Text>
              <Text style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, textAlign: "center" }}>
                ลองสมัครสินค้าทดสอบใช้ฟรี แล้วติดตามสถานะได้ที่นี่
              </Text>
              <Pressable
                onPress={goToTrials}
                className="active:opacity-80"
                style={{ flexDirection: "row", alignItems: "center", gap: 6, height: 40, paddingHorizontal: 20, borderRadius: 999, backgroundColor: BRAND_GREEN }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>ดูผลิตภัณฑ์ทดสอบทั้งหมด</Text>
                <ChevronRight size={16} strokeWidth={2.4} color="#fff" />
              </Pressable>
            </View>
          ) : (
            list.map(({ reg, product }) => (
              <TrialItemCard
                key={reg.trialId}
                product={product}
                registration={reg}
                onView={() => openDetail(reg.id)}
                onEvaluate={(kind) => openEval(reg.id, kind)}
              />
            ))
          )}
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <BottomFade />
      </View>
    </View>
  );
}
