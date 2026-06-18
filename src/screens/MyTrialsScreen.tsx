import { useMemo, useState } from "react";
import { View, Text, Image, Pressable, ScrollView, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import {
  FlaskConical,
  Sparkles,
  Clock,
  Coins,
  Check,
  MapPin,
  ChevronRight,
  FileText,
  Calendar,
  type LucideIcon,
} from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

// ── Mock data (ported from web ../data/trialProducts.ts) ──────────────────────
// Only the fields the card needs are carried over. Product entries are the subset
// that the seed registrations below actually reference, so both tabs render.

// Trial data comes from the canonical TrialProductsScreen list (local photos)
// so each registration row matches the card/detail the user joined.
import { TRIAL_PRODUCTS, TrialProduct } from "./TrialProductsScreen";

/** Resolve a local bundled image (require → number) or remote URL string. */
function imgSource(src: number | string | undefined): any {
  return typeof src === "number" ? src : { uri: src };
}

type Registration = {
  trialId: string;
  address: string;
  submittedAt: number;
  evaluatedAt?: number;
};

const DAY = 1000 * 60 * 60 * 24;
const now = Date.now();

const REGISTRATIONS: Registration[] = [
  // Active (still testing — approved but not yet evaluated)
  {
    trialId: "trial-1",
    address: "459/153 ถ.สุขสวัสดิ์ ราษฎร์บูรณะ กรุงเทพฯ 10140",
    submittedAt: now - DAY * 5,
  },
  {
    trialId: "trial-6",
    address: "459/153 ถ.สุขสวัสดิ์ ราษฎร์บูรณะ กรุงเทพฯ 10140",
    submittedAt: now - DAY * 2,
  },
  // Completed (evaluated → earned reward points)
  {
    trialId: "trial-4",
    address: "459/153 ถ.สุขสวัสดิ์ ราษฎร์บูรณะ กรุงเทพฯ 10140",
    submittedAt: now - DAY * 30,
    evaluatedAt: now - DAY * 10,
  },
  {
    trialId: "trial-eq",
    address: "459/153 ถ.สุขสวัสดิ์ ราษฎร์บูรณะ กรุงเทพฯ 10140",
    submittedAt: now - DAY * 20,
    evaluatedAt: now - DAY * 5,
  },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

type TabKey = "active" | "completed";

const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "2-digit" });

type Enriched = { reg: Registration; product: TrialProduct };

// ── Small presentational pieces (module scope) ─────────────────────────────────

function TabButton({
  active,
  label,
  count,
  Icon,
  onPress,
}: {
  active: boolean;
  label: string;
  count: number;
  Icon: LucideIcon;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={{
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        height: 36,
        borderRadius: 999,
        backgroundColor: active ? BRAND_GREEN : "transparent",
      }}
    >
      <Icon size={15} strokeWidth={2.2} color={active ? "#fff" : BRAND_GREEN_DARK} />
      <Text
        style={{
          fontSize: 13,
          fontWeight: "600",
          color: active ? "#fff" : BRAND_GREEN_DARK,
        }}
      >
        {label}
      </Text>
      {count > 0 && (
        <View
          style={{
            minWidth: 18,
            height: 18,
            paddingHorizontal: 5,
            borderRadius: 999,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: active ? "#fff" : "#ef4444",
          }}
        >
          <Text style={{ fontSize: 10, fontWeight: "700", color: active ? "#ef4444" : "#fff" }}>
            {count}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

function MetaRow({ Icon, color, children }: { Icon: LucideIcon; color: string; children: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <Icon size={12} strokeWidth={2.3} color={color} />
      <Text style={{ fontSize: 12, color, fontWeight: "500" }}>{children}</Text>
    </View>
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
  onEvaluate: () => void;
}) {
  const isEvaluated = !!registration.evaluatedAt;

  return (
    <View
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#ececed",
        padding: 16,
        gap: 12,
      }}
    >
      <View style={{ flexDirection: "row", gap: 14 }}>
        {/* Image + badge */}
        <Pressable onPress={onView} style={{ position: "relative" }}>
          <Image
            source={imgSource(product.imageSrc ?? product.image)}
            style={{ width: 100, height: 100, borderRadius: 12, backgroundColor: "#f3f4f6" }}
          />
          <View style={{ position: "absolute", top: 6, left: 6 }}>
            {isEvaluated ? (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: BRAND_GREEN,
                }}
              >
                <Check size={10} strokeWidth={2.8} color="#fff" />
                <Text style={{ fontSize: 10, fontWeight: "600", color: "#fff" }}>เสร็จ</Text>
              </View>
            ) : (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  paddingHorizontal: 7,
                  paddingVertical: 2,
                  borderRadius: 999,
                  backgroundColor: "#0088ff",
                }}
              >
                <Sparkles size={10} strokeWidth={2.4} color="#fff" />
                <Text style={{ fontSize: 10, fontWeight: "600", color: "#fff" }}>Beta</Text>
              </View>
            )}
          </View>
        </Pressable>

        {/* Info */}
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          <Text
            style={{
              fontSize: 11,
              fontWeight: "600",
              color: BRAND_GREEN,
              letterSpacing: 0.4,
            }}
          >
            {product.category.toUpperCase()}
          </Text>
          <Pressable onPress={onView}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: "#1a1a1a" }}>{product.name}</Text>
          </Pressable>

          <View style={{ gap: 4, marginTop: 2 }}>
            <MetaRow Icon={Calendar} color={TEXT_MUTED}>
              {`สมัคร ${fmtDate(registration.submittedAt)}`}
            </MetaRow>
            {registration.evaluatedAt && (
              <MetaRow Icon={Check} color={TEXT_MUTED}>
                {`ส่งแบบประเมิน ${fmtDate(registration.evaluatedAt)}`}
              </MetaRow>
            )}
            <MetaRow Icon={Coins} color="#d97706">
              {`+${product.rewardPoints.toLocaleString()} คะแนน`}
            </MetaRow>
          </View>

          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 5, marginTop: 2 }}>
            <MapPin size={12} strokeWidth={2.2} color={TEXT_MUTED} style={{ marginTop: 1 }} />
            <Text style={{ fontSize: 12, color: TEXT_MUTED, flex: 1 }} numberOfLines={1}>
              {registration.address}
            </Text>
          </View>

          {!isEvaluated && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
              <Clock size={12} strokeWidth={2.4} color="#d97706" />
              <Text style={{ fontSize: 12, color: "#b45309", fontWeight: "500", flex: 1 }}>
                เหลือเวลาส่งแบบประเมินอีกประมาณ 30 วัน
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Actions */}
      {isEvaluated ? (
        <Pressable
          onPress={onView}
          style={{
            height: 40,
            borderRadius: 999,
            borderWidth: 1,
            borderColor: "#e5e7eb",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "500", color: "#374151" }}>ดูรายละเอียด</Text>
        </Pressable>
      ) : (
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            onPress={onEvaluate}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              height: 40,
              borderRadius: 999,
              backgroundColor: BRAND_GREEN,
            }}
          >
            <FileText size={14} strokeWidth={2.4} color="#fff" />
            <Text style={{ fontSize: 13, fontWeight: "600", color: "#fff" }}>ทำแบบประเมิน</Text>
          </Pressable>
          <Pressable
            onPress={onView}
            style={{
              flex: 1,
              alignItems: "center",
              justifyContent: "center",
              height: 40,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#e5e7eb",
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: "500", color: BRAND_GREEN }}>ดูรายละเอียด</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────

export function MyTrialsScreen() {
  const nav = useNavigation();
  const [tab, setTab] = useState<TabKey>("active");

  const enriched = useMemo<Enriched[]>(
    () =>
      REGISTRATIONS.map((reg) => ({
        reg,
        product: TRIAL_PRODUCTS.find((p) => p.id === reg.trialId),
      })).filter((x): x is Enriched => !!x.product),
    []
  );

  const active = useMemo(() => enriched.filter((x) => !x.reg.evaluatedAt), [enriched]);
  const completed = useMemo(() => enriched.filter((x) => !!x.reg.evaluatedAt), [enriched]);

  const totalEarned = useMemo(
    () => completed.reduce((sum, x) => sum + x.product.rewardPoints, 0),
    [completed]
  );

  const list = tab === "active" ? active : completed;

  const goToTrials = () => (nav.navigate as (route: string, params?: object) => void)("TrialProducts");
  const onView = (id: string) => (nav.navigate as (route: string, params?: object) => void)("TrialDetail", { id });
  const onEvaluate = () => Alert.alert("กำลังพัฒนา", "แบบประเมินผลิตภัณฑ์ทดสอบกำลังพัฒนา");

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
      >
        {/* Reward summary */}
        {totalEarned > 0 && (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#ececed",
              padding: 16,
              flexDirection: "row",
              alignItems: "center",
              gap: 12,
            }}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 999,
                backgroundColor: "rgba(217,119,6,0.12)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Coins size={22} strokeWidth={2.2} color="#d97706" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 12, color: TEXT_SECONDARY }}>คะแนนสะสมจากการทดสอบ</Text>
              <Text style={{ fontSize: 20, fontWeight: "700", color: "#1a1a1a" }}>
                {totalEarned.toLocaleString()} คะแนน
              </Text>
            </View>
          </View>
        )}

        {/* Tabs */}
        <View
          style={{
            flexDirection: "row",
            gap: 4,
            padding: 5,
            borderRadius: 999,
            backgroundColor: "#fff",
            borderWidth: 1,
            borderColor: "#ececed",
          }}
        >
          <TabButton
            active={tab === "active"}
            label="กำลังทดสอบ"
            count={active.length}
            Icon={FlaskConical}
            onPress={() => setTab("active")}
          />
          <TabButton
            active={tab === "completed"}
            label="ทดสอบเสร็จแล้ว"
            count={completed.length}
            Icon={Check}
            onPress={() => setTab("completed")}
          />
        </View>

        {/* List or empty state */}
        {list.length === 0 ? (
          <View
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              borderWidth: 1,
              borderColor: "#ececed",
              padding: 32,
              alignItems: "center",
            }}
          >
            <View
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                backgroundColor: "#f3f4f6",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
              }}
            >
              <FlaskConical size={24} strokeWidth={2.2} color="#9ca3af" />
            </View>
            <Text style={{ fontSize: 14, fontWeight: "600", color: "#4b5563", marginBottom: 4 }}>
              {tab === "active" ? "ยังไม่มีสินค้าที่กำลังทดสอบ" : "ยังไม่มีรายการที่ทดสอบเสร็จ"}
            </Text>
            <Text
              style={{ fontSize: 13, color: "#6b7280", marginBottom: 16, textAlign: "center" }}
            >
              {tab === "active"
                ? "ลองสมัครสินค้าทดสอบเพื่อรับฟรี + สะสมคะแนน"
                : "ส่งแบบประเมินรายการที่กำลังทดสอบเพื่อรับคะแนน"}
            </Text>
            <Pressable
              onPress={goToTrials}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                height: 40,
                paddingHorizontal: 20,
                borderRadius: 999,
                backgroundColor: BRAND_GREEN,
              }}
            >
              <Text style={{ fontSize: 14, fontWeight: "600", color: "#fff" }}>
                ดูผลิตภัณฑ์ทดสอบทั้งหมด
              </Text>
              <ChevronRight size={16} strokeWidth={2.4} color="#fff" />
            </Pressable>
          </View>
        ) : (
          list.map(({ reg, product }) => (
            <TrialItemCard
              key={reg.trialId}
              product={product}
              registration={reg}
              onView={() => onView(product.id)}
              onEvaluate={onEvaluate}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}
