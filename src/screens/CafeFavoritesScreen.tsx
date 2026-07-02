/**
 * META Caffe — favourite menu.
 * Items the customer starred (with their saved options). Tapping one opens the
 * item detail pre-filled with those options so they can quickly reorder "the
 * usual". The star removes it from favourites.
 */
import { View, Text, ScrollView, Pressable, Image } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Star } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { useCafeCart } from "../context/CafeCartContext";
import { CAFE_MENU } from "../data/cafeMenu";
import { BRAND_GREEN, TEXT_PRIMARY, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const baht = (n: number) => "฿" + n.toLocaleString();

export function CafeFavoritesScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { favorites, toggleFavorite } = useCafeCart();

  // Resolve each favourite to its menu item; drop any that no longer exist.
  const rows = favorites
    .map((fav) => ({ fav, item: CAFE_MENU.find((m) => m.id === fav.itemId) }))
    .filter((r): r is { fav: (typeof favorites)[number]; item: (typeof CAFE_MENU)[number] } => !!r.item);

  const empty = rows.length === 0;

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="เมนูโปรด" subtitle="META Caffe" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      {empty ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 32, gap: 14 }}>
          <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: "rgba(247,147,29,0.12)", alignItems: "center", justifyContent: "center" }}>
            <Star size={36} color="#f7931d" fill="#f7931d" strokeWidth={1.6} />
          </View>
          <Text style={{ fontSize: 16, fontWeight: "800", color: TEXT_PRIMARY }}>ยังไม่มีเมนูโปรด</Text>
          <Text style={{ fontSize: 13, color: TEXT_SECONDARY, textAlign: "center", lineHeight: 19 }}>แตะรูปดาวในหน้ารายละเอียดเมนู เพื่อบันทึกไว้สั่งซ้ำได้ทันที</Text>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 12 }}>
            {rows.map(({ fav, item }) => (
              <Pressable
                key={fav.itemId}
                onPress={() => nav.navigate("CafeItemDetail", { item, initial: { sweet: fav.opts.sweet, milk: fav.opts.milk, shot: fav.opts.shot, note: fav.opts.note, qty: 1 } })}
                className="active:opacity-90"
                style={{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 12 }}
              >
                <Image source={item.image} style={{ width: 64, height: 64, borderRadius: 12, backgroundColor: "#f5f5f5" }} resizeMode="cover" />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "700", color: TEXT_PRIMARY }}>{item.name}</Text>
                  {fav.summary ? <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>{fav.summary}</Text> : null}
                  <Text style={{ fontSize: 14, fontWeight: "800", color: BRAND_GREEN, marginTop: 4 }}>{baht(item.price)}</Text>
                </View>
                <Pressable onPress={() => toggleFavorite(fav)} hitSlop={8} className="active:opacity-60" style={{ padding: 4 }}>
                  <Star size={22} color="#f7931d" fill="#f7931d" strokeWidth={1.8} />
                </Pressable>
              </Pressable>
            ))}
          </ScrollView>
          {/* Edge fades */}
          <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 20 }} />
          <LinearGradient pointerEvents="none" colors={["rgba(250,250,250,0)", "#fafafa"]} style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 36 }} />
        </View>
      )}
    </View>
  );
}
