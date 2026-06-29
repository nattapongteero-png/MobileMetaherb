import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  X,
  ClipboardList,
  FileText,
  Package,
  Zap,
  Megaphone,
  Ticket,
  TrendingUp,
  Users,
  ShoppingBag,
  BarChart2,
  Beaker,
  LayoutDashboard,
  ArrowDownToLine,
  type LucideIcon,
} from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { SHOP_MENU, type SectionId } from "./MyShopScreen";
import { BRAND_GREEN } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

const LABEL = "#1c1c1e";
type Nav = NativeStackNavigationProp<RootStackParamList>;
type MenuRoute = RouteProp<RootStackParamList, "MyShopMenu">;

// Per-submenu icons — mirrors the web OwnerDashboard childIconMap so sub-items
// keep their own icon instead of inheriting the parent group's.
const CHILD_ICON: Partial<Record<SectionId, LucideIcon>> = {
  hm_quotations: ClipboardList,
  hm_pr: ClipboardList,
  hm_po: FileText,
  products_manage: Package,
  flash_sale: Zap,
  promotions: Megaphone,
  coupons: Ticket,
  trials_products: Beaker,
  trials_tracking: ClipboardList,
  report_sales: TrendingUp,
  report_customers: Users,
  report_products: ShoppingBag,
  report_market: BarChart2,
  finance_tx: ArrowDownToLine,
  finance_overview: LayoutDashboard,
};

/** Web OwnerDashboard "MenuBtn" style: icon-in-a-circle + label. The focused row
 *  gets a green circle, white icon, green label and a faint green pill. */
function MenuBtn({ Icon, label, active, onPress }: { Icon: LucideIcon; label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center active:opacity-80"
      style={{ gap: 11, paddingVertical: 6, paddingHorizontal: 8, borderRadius: 200, marginBottom: 2, backgroundColor: active ? "rgba(49,151,84,0.1)" : "transparent" }}
    >
      <View style={{ width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center", backgroundColor: active ? BRAND_GREEN : "#f5f5f5" }}>
        <Icon size={17} color={active ? "#fff" : "rgba(0,0,0,0.85)"} strokeWidth={2.2} />
      </View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: active ? "700" : "500", color: active ? BRAND_GREEN : LABEL }}>{label}</Text>
    </Pressable>
  );
}

/** Owner-console section menu — full-screen modal styled like the web sidebar
 *  (icon buttons + focused-item highlight). Selecting pops back to MyShop. */
export function MyShopMenuScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const params = useRoute<MenuRoute>().params;
  const current = params?.current as SectionId | undefined;
  const select = (id: SectionId) => {
    params?.onSelect?.(id);
    nav.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fff" }}>
      <View style={styles.header}>
        <GlassIconButton onPress={() => nav.goBack()} size={44} accessibilityLabel="ปิด">
          <X size={22} color="#1a1a1a" strokeWidth={2.6} />
        </GlassIconButton>
        <Text style={{ fontSize: 18, fontWeight: "700", color: LABEL }}>เมนูร้านค้า</Text>
        <View style={{ width: 44, height: 44 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 14, paddingTop: 4, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {SHOP_MENU.map((node) => {
          // Leaf node → a single icon button.
          if (!node.children?.length) {
            return <MenuBtn key={node.id} Icon={node.Icon} label={node.label} active={current === node.id} onPress={() => select(node.id)} />;
          }
          // Group → small header + children (children reuse the group's icon).
          return (
            <View key={node.id} style={{ marginTop: 12 }}>
              <Text style={styles.group}>{node.label}</Text>
              {node.children.map((child) => (
                <MenuBtn key={child.id} Icon={CHILD_ICON[child.id] ?? node.Icon} label={child.label} active={current === child.id} onPress={() => select(child.id)} />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  group: { fontSize: 12, fontWeight: "700", color: "#9ca3af", marginLeft: 10, marginBottom: 6, marginTop: 4 },
});
