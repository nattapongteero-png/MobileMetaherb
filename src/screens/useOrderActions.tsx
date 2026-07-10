import { Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useOrders } from "../context/OrderContext";
import { complaintForOrder } from "../store/complaints";
import type { Order } from "../data/orders";
import type { OrderAction } from "../components/OrderActionButtons";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * Shared order action handlers — wired to OrderActionButtons on both the list
 * card and the detail screen so the available actions never drift.
 */
export function useOrderActions() {
  const nav = useNavigation<Nav>();
  const { setStatus } = useOrders();

  const handleAction = (order: Order, a: OrderAction) => {
    switch (a) {
      case "pay":
        nav.navigate("PromptPayQR", { total: order.total, orderId: order.id });
        break;
      case "cancel":
        Alert.alert("ยกเลิกคำสั่งซื้อ", `ต้องการยกเลิก ${order.id}?`, [
          { text: "ไม่", style: "cancel" },
          { text: "ยกเลิกเลย", style: "destructive", onPress: () => setStatus(order.id, "cancelled") },
        ]);
        break;
      case "received":
        Alert.alert("ยืนยันรับสินค้า", "ได้รับสินค้าครบถ้วนแล้วใช่ไหม?", [
          { text: "ยังไม่ได้รับ", style: "cancel" },
          { text: "ได้รับแล้ว", onPress: () => setStatus(order.id, "delivered") },
        ]);
        break;
      case "review":
        nav.navigate("OrderReview", { orderId: order.id });
        break;
      case "rebuy":
        nav.navigate("Products");
        break;
      case "complaint": {
        // Already filed against this order? Show its live status instead of
        // letting the buyer open a second case.
        const existing = complaintForOrder(order.userId, order.id);
        if (existing) nav.navigate("ComplaintStatus", { complaintId: existing.id });
        else nav.navigate("ComplaintSelect", { orderId: order.id });
        break;
      }
      case "contact":
        Alert.alert("กำลังพัฒนา", "ฟีเจอร์นี้อยู่ระหว่างพัฒนา");
        break;
    }
  };

  return { handleAction };
}
