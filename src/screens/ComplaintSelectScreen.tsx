import { View, Text, Pressable, ScrollView, Alert } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  PackageX,
  HelpCircle,
  Undo2,
  BadgeDollarSign,
  ChevronRight,
  type LucideIcon,
} from "lucide-react-native";
import { BRAND_GREEN, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
// Params are typed locally — register "ComplaintSelect" in RootStackParamList
// later and this can switch to RouteProp<RootStackParamList, "ComplaintSelect">.
type ComplaintParams = { orderId?: string; shopName?: string };

// Ported verbatim from the web ComplaintSelectPage + LanguageContext (th).
// The web renders an ornate SVG box with a colored badge per type; on mobile
// we keep the per-type badge color and swap in a clean lucide glyph.
type ProblemType = {
  id: string;
  title: string;
  desc: string;
  color: string;
  Icon: LucideIcon;
};

const PROBLEM_TYPES: ProblemType[] = [
  {
    id: "damaged",
    title: "สินค้าเสียหาย",
    desc: "สินค้าที่มีรอยแตก บุบ หรือชำรุดจากการขนส่ง",
    color: "#FF383C",
    Icon: PackageX,
  },
  {
    id: "wrong_item",
    title: "สินค้าไม่ตรงตามที่สั่ง",
    desc: "ได้รับสินค้าผิดรายการจากที่สั่ง",
    color: "#DF9723",
    Icon: HelpCircle,
  },
  {
    id: "return",
    title: "ต้องการคืนสินค้า",
    desc: "ส่งคืนสินค้าและรับเป็นเครดิตหรือสินค้าใหม่",
    color: "#9747FF",
    Icon: Undo2,
  },
  {
    id: "refund",
    title: "ต้องการขอเงินคืน",
    desc: "ต้องการขอคืนเงินจากการสั่งซื้อ",
    color: "#0088FF",
    Icon: BadgeDollarSign,
  },
];

function ProblemCard({ type, onPress }: { type: ProblemType; onPress: () => void }) {
  const { Icon, color } = type;
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-80"
      style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#ececed",
        padding: 16,
        flexDirection: "row",
        alignItems: "center",
        gap: 14,
      }}
    >
      {/* Colored icon chip — mirrors the web badge color */}
      <View
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: color + "1a",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={26} color={color} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 16, fontWeight: "600", color: "#0a0a0a" }}>{type.title}</Text>
        <Text style={{ fontSize: 13, color: TEXT_SECONDARY, marginTop: 3, lineHeight: 18 }}>{type.desc}</Text>
      </View>
      <ChevronRight size={20} color={TEXT_MUTED} />
    </Pressable>
  );
}

export function ComplaintSelectScreen() {
  const nav = useNavigation<Nav>();
  const params = useRoute().params as ComplaintParams | undefined;
  const orderId = params?.orderId ?? "ORD-20260218-03571";
  const shopName = params?.shopName ?? "METAHERB Store";

  const handleSelect = (type: ProblemType) => {
    // Web routes to /complaint/form/:orderId?type=... — that screen isn't
    // ported yet, so surface a placeholder.
    Alert.alert("กำลังพัฒนา", `แบบฟอร์มแจ้งปัญหา "${type.title}" อยู่ระหว่างพัฒนา`);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}
      >
        {/* Title */}
        <Text style={{ fontSize: 20, fontWeight: "700", color: "#0a0a0a" }}>โปรดระบุปัญหาที่คุณพบ</Text>

        {/* Order info (web: gray info box) */}
        <View style={{ backgroundColor: "#f9fafb", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", padding: 12 }}>
          <Text style={{ fontSize: 12, color: "#999" }}>คำสั่งซื้อ: {orderId}</Text>
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a", marginTop: 2 }}>{shopName}</Text>
        </View>

        {/* Problem types (single mobile column) */}
        <View style={{ gap: 12 }}>
          {PROBLEM_TYPES.map((type) => (
            <ProblemCard key={type.id} type={type} onPress={() => handleSelect(type)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
