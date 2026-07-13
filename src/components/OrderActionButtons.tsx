import { View, Text, Pressable } from "react-native";
import { Star, MessageCircle, ShoppingCart, type LucideIcon } from "lucide-react-native";
import { BRAND_GREEN } from "../theme/tokens";
import type { Order } from "../data/orders";

export type OrderAction =
  | "pay"
  | "cancel"
  | "received"
  | "review"
  | "rebuy"
  | "contact"
  | "complaint";

function Btn({
  label,
  onPress,
  variant,
  Icon,
  height = 38,
  fill = false,
}: {
  label: string;
  onPress: () => void;
  variant: "primary" | "outline" | "danger" | "amber" | "gray";
  Icon?: LucideIcon;
  height?: number;
  fill?: boolean;
}) {
  const styles = {
    primary: { bg: BRAND_GREEN, border: BRAND_GREEN, text: "#fff" },
    amber: { bg: "#f7931d", border: "#f7931d", text: "#fff" },
    outline: { bg: "transparent", border: BRAND_GREEN, text: BRAND_GREEN },
    danger: { bg: "transparent", border: "#ef4444", text: "#ef4444" },
    gray: { bg: "transparent", border: "#e5e7eb", text: "#374151" },
  }[variant];
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center justify-center active:opacity-80"
      style={{ flex: fill ? 1 : undefined, height, paddingHorizontal: 18, borderRadius: 999, backgroundColor: styles.bg, borderWidth: 1, borderColor: styles.border, gap: 5 }}
    >
      {Icon ? <Icon size={15} color={styles.text} strokeWidth={2.2} /> : null}
      <Text style={{ fontSize: 13, fontWeight: "600", color: styles.text }}>{label}</Text>
    </Pressable>
  );
}

/**
 * Whether a status renders any action button — lets the detail screen hide its
 * floating bar entirely when there's nothing to do (e.g. awaiting verification).
 */
export function hasOrderActions(order: Order): boolean {
  switch (order.status) {
    case "pending_verify":
      return false;
    case "delivered":
      return !order.review;
    default:
      return true;
  }
}

/**
 * The per-status action buttons for an order (pay / cancel / review / rebuy …).
 * Shared by the order list card and the order detail screen so the available
 * actions never drift between the two.
 */
export function OrderActionButtons({
  order,
  onAction,
  buttonHeight = 38,
  fill = false,
}: {
  order: Order;
  onAction: (a: OrderAction) => void;
  /** Pill height — 38 on the list card, 50 in the detail floating bar. */
  buttonHeight?: number;
  /** Stretch each button to fill the width (used by the detail floating bar). */
  fill?: boolean;
}) {
  const h = buttonHeight;
  return (
    <View style={{ flexDirection: "row", gap: 8, flex: fill ? 1 : undefined }}>
      {order.status === "pending_payment" ? (
        <>
          <Btn label="ยกเลิก" variant="danger" height={h} fill={fill} onPress={() => onAction("cancel")} />
          <Btn label="ชำระเงิน" variant="primary" height={h} fill={fill} onPress={() => onAction("pay")} />
        </>
      ) : null}
      {/* pending_verify has no action — the system verifies the payment automatically. */}
      {order.status === "preparing" ? <Btn label="ติดต่อร้าน" variant="outline" Icon={MessageCircle} height={h} fill={fill} onPress={() => onAction("contact")} /> : null}
      {order.status === "shipping" ? <Btn label="ยืนยันรับสินค้า" variant="primary" height={h} fill={fill} onPress={() => onAction("received")} /> : null}
      {order.status === "delivered" && !order.review ? (
        <>
          <Btn label="แจ้งปัญหาสินค้า" variant="gray" height={h} fill={fill} onPress={() => onAction("complaint")} />
          <Btn label="รีวิวสินค้า" variant="amber" Icon={Star} height={h} fill={fill} onPress={() => onAction("review")} />
        </>
      ) : null}
      {order.status === "completed" ? <Btn label="ซื้ออีกครั้ง" variant="primary" Icon={ShoppingCart} height={h} fill={fill} onPress={() => onAction("rebuy")} /> : null}
      {order.status === "cancelled" ? <Btn label="ซื้อใหม่" variant="primary" height={h} fill={fill} onPress={() => onAction("rebuy")} /> : null}
    </View>
  );
}
