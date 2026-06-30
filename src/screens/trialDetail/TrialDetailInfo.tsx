/**
 * TrialDetailInfo — INFO (ข้อมูลสินค้า) tab of the owner trial detail screen.
 *
 * Ported from web TrialDetailPage info branch (OwnerTrialTabs.tsx @ L3255+).
 * Renders the InfoCard sections faithfully:
 *   - ข้อมูลพื้นฐาน  (ชื่อสินค้า / หมวดหมู่ / Studio / Tagline)
 *   - เงื่อนไขการทดสอบ (จำนวนที่นั่ง / ระยะเวลาทดสอบ / คะแนนตอบแทน)
 *   - รายละเอียดสินค้า (only when product.detail?.productInfo has rows)
 *
 * The web eval/document card (previewForms) is intentionally out of scope for
 * this tab port.
 */

import { View, Text } from "react-native";

/** Loose shape — mobile TrialProduct lacks `detail`, so it's optional here. */
export type TrialDetailInfoProduct = {
  name: string;
  category: string;
  tagline: string;
  studioName?: string;
  spotsTotal: number;
  /** Mobile carries spotsTaken; spotsLeft is derived. */
  spotsTaken?: number;
  spotsLeft?: number;
  endsInDays: number;
  rewardPoints: number;
  detail?: {
    productInfo?: { label: string; value: string }[];
  };
};

/** Web: bg-white rounded-2xl border border-gray-100 p-4. */
function InfoCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: string }[];
}) {
  return (
    <View
      style={{
        backgroundColor: "#ffffff",
        borderRadius: 16, // rounded-2xl
        borderWidth: 1,
        borderColor: "#f3f4f6", // gray-100
        padding: 16, // p-4
      }}
    >
      {/* title — text-[12px] text-gray-500 uppercase tracking-wide mb-3, weight 600 */}
      <Text
        style={{
          fontSize: 12,
          color: "#6b7280", // gray-500
          textTransform: "uppercase",
          letterSpacing: 0.6, // tracking-wide
          marginBottom: 12, // mb-3
          fontWeight: "600",
        }}
      >
        {title}
      </Text>

      {/* Web is a 2-col grid on sm+; on a 430px phone we stack to 1 col
          (gap-y-2.5 = 10px between rows). */}
      <View style={{ gap: 10 }}>
        {rows.map((r) => (
          <View key={r.label}>
            {/* label — text-[11px] text-gray-400, weight 500 */}
            <Text style={{ fontSize: 11, color: "#9ca3af", fontWeight: "500" }}>
              {r.label}
            </Text>
            {/* value — text-[12.5px] text-[#1a1a1a] mt-0.5, weight 500 */}
            <Text
              style={{
                fontSize: 12.5,
                color: "#1a1a1a",
                marginTop: 2, // mt-0.5
                fontWeight: "500",
              }}
            >
              {r.value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

export function TrialDetailInfo({ product }: { product: TrialDetailInfoProduct }) {
  // Web derives spotsLeft from real registrations; mobile carries spotsTaken.
  const spotsLeft =
    product.spotsLeft ??
    Math.max(0, product.spotsTotal - (product.spotsTaken ?? 0));

  const productInfo = product.detail?.productInfo;

  return (
    // Web wrapper: space-y-4 (16px vertical gap between cards).
    <View style={{ gap: 16 }}>
      {/* Basic info */}
      <InfoCard
        title="ข้อมูลพื้นฐาน"
        rows={[
          { label: "ชื่อสินค้า", value: product.name },
          { label: "หมวดหมู่", value: product.category },
          { label: "Studio", value: product.studioName ?? "—" },
          { label: "Tagline", value: product.tagline },
        ]}
      />

      {/* Trial conditions */}
      <InfoCard
        title="เงื่อนไขการทดสอบ"
        rows={[
          {
            label: "จำนวนที่นั่ง",
            value: `${product.spotsTotal} ที่ (เหลือ ${spotsLeft})`,
          },
          { label: "ระยะเวลาทดสอบ", value: `${product.endsInDays} วัน` },
          { label: "คะแนนตอบแทน", value: `${product.rewardPoints} pts` },
        ]}
      />

      {/* Detail content (only when present) */}
      {productInfo && productInfo.length > 0 && (
        <InfoCard
          title="รายละเอียดสินค้า"
          rows={productInfo.map((p) => ({ label: p.label, value: p.value }))}
        />
      )}
    </View>
  );
}
