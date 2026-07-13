import { View, Text } from "react-native";
import {
  Check,
  X,
  ShoppingBag,
  CreditCard,
  Eye,
  Package,
  Truck,
  Home,
  Star,
  type LucideIcon,
} from "lucide-react-native";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import type { OrderStatus } from "../data/orders";

// Vertical fulfilment tracker (top → bottom), one row per stage with a timestamp.
// "ordered" is a synthetic first node that's always complete (the order exists).
const STEPS: { key: "ordered" | OrderStatus; label: string; Icon: LucideIcon }[] = [
  { key: "ordered", label: "คำสั่งซื้อ", Icon: ShoppingBag },
  { key: "pending_payment", label: "รอการชำระ", Icon: CreditCard },
  { key: "pending_verify", label: "ตรวจสอบการชำระ", Icon: Eye },
  { key: "preparing", label: "กำลังจัดเตรียม", Icon: Package },
  { key: "shipping", label: "กำลังจัดส่ง", Icon: Truck },
  { key: "delivered", label: "จัดส่งสำเร็จ", Icon: Home },
  { key: "completed", label: "เสร็จสมบูรณ์", Icon: Star },
];

const INDEX_OF: Record<string, number> = STEPS.reduce(
  (acc, s, i) => ((acc[s.key] = i), acc),
  {} as Record<string, number>,
);

export function OrderTimeline({ status, date }: { status: OrderStatus; date?: string }) {
  if (status === "cancelled") {
    return (
      <View style={{ flexDirection: "row" }}>
        <View style={{ width: 28, alignItems: "center" }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#fee2e2", alignItems: "center", justifyContent: "center" }}>
            <X size={15} color="#ef4444" strokeWidth={2.6} />
          </View>
        </View>
        <View style={{ flex: 1, paddingLeft: 12, marginTop: 2 }}>
          <Text style={{ fontSize: 13.5, fontWeight: "700", color: "#ef4444" }}>คำสั่งซื้อถูกยกเลิก</Text>
          {date ? <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>{date}</Text> : null}
        </View>
      </View>
    );
  }

  const currentIndex = INDEX_OF[status] ?? 0;

  return (
    <View>
      {STEPS.map((step, i) => {
        const done = i < currentIndex;
        const current = i === currentIndex;
        const reached = done || current;
        const isLast = i === STEPS.length - 1;
        return (
          <View key={step.key} style={{ flexDirection: "row" }}>
            {/* Left rail — numbered circle + connecting line */}
            <View style={{ width: 28, alignItems: "center" }}>
              <View
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 13,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: reached ? BRAND_GREEN : "#e5e5e5",
                  borderWidth: current ? 3 : 0,
                  borderColor: "rgba(49,151,84,0.22)",
                }}
              >
                {done ? (
                  <Check size={14} color="#fff" strokeWidth={2.8} />
                ) : (
                  <step.Icon size={14} color={current ? "#fff" : "#a3a3a3"} strokeWidth={2.3} />
                )}
              </View>
              {!isLast ? (
                <View style={{ flex: 1, width: 2, backgroundColor: done ? BRAND_GREEN : "#e5e5e5", marginVertical: 3 }} />
              ) : null}
            </View>

            {/* Content — label + timestamp */}
            <View style={{ flex: 1, paddingLeft: 12, paddingBottom: isLast ? 0 : 18, marginTop: 2 }}>
              <Text style={{ fontSize: 13.5, fontWeight: current ? "700" : "600", color: reached ? BRAND_GREEN : "#a3a3a3" }}>
                {step.label}
              </Text>
              <Text style={{ fontSize: 11.5, color: reached ? TEXT_MUTED : "#c4c4c4", marginTop: 2 }}>
                {reached ? (date ?? "") : "รอดำเนินการ"}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}
