import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View, type GestureResponderEvent } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Search, X, Zap } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { BottomFade } from "../components/BottomFade";
import type { RootStackParamList } from "../navigation/RootStack";
import { FlashProductCard, FlashCardMenu, FLASH_PRODUCTS, SHOP_FLASH_PRODUCTS, NON_FLASH_PRODUCTS, type FlashProduct } from "./MyShopScreen";
import { cardMenuAnchor, type CardMenuAnchor } from "../components/AppleMenu";
import { BORDER_GRAY, TEXT_DISABLED } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Flash Sale search — pushed from the Flash Sale app-bar search button. Covers
// the WHOLE catalog (joined + not joined) so products can be ADDED to a flash
// round right from a search result's ⋯ menu.
export function ShopFlashSearchScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");
  // Local mutable copy so edits from the ⋯ sheet reflect in the results.
  const [items, setItems] = useState<FlashProduct[]>([...FLASH_PRODUCTS, ...SHOP_FLASH_PRODUCTS, ...NON_FLASH_PRODUCTS]);
  const [menuFor, setMenuFor] = useState<FlashProduct | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<CardMenuAnchor | null>(null);
  const rootRef = useRef<View>(null);
  const openMenu = (p: FlashProduct, e: GestureResponderEvent) => {
    const { pageX, pageY } = e.nativeEvent;
    rootRef.current?.measureInWindow((rx, ry, rw, rh) => {
      setMenuAnchor(cardMenuAnchor(pageX, pageY, rx, ry, rw, rh));
      setMenuFor(p);
    });
  };

  const q = query.trim().toLowerCase();
  const results = useMemo(
    () => (q ? items.filter((p) => p.name.toLowerCase().includes(q)) : items),
    [items, q],
  );

  return (
    <View ref={rootRef} className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SafeAreaView edges={["top"]}>
        {/* App bar — back button + search pill */}
        <View className="flex-row items-center" style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 10 }}>
          <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={22} color="#1a1a1a" strokeWidth={2.4} />
          </GlassIconButton>
          <View
            className="flex-row items-center rounded-full px-4"
            style={{
              flex: 1,
              height: 46,
              backgroundColor: "#ffffff",
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
          >
            <Search size={18} color="#319754" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="ค้นหาสินค้า Flash Sale..."
              placeholderTextColor="#a3a3a3"
              returnKeyType="search"
              autoFocus
              style={{ flex: 1, marginLeft: 10, fontSize: 13.5, color: "#374151" }}
            />
            {query ? (
              <Pressable onPress={() => setQuery("")} hitSlop={8} className="active:opacity-60">
                <X size={16} color="#a3a3a3" />
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>

      {/* Results */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}
      >
        {results.length === 0 ? (
          <View style={{ paddingVertical: 64, alignItems: "center", gap: 8 }}>
            <Zap size={40} color={BORDER_GRAY} strokeWidth={1.5} />
            <Text style={{ fontSize: 14, color: TEXT_DISABLED }}>ไม่พบสินค้า Flash Sale</Text>
          </View>
        ) : (
          results.map((p) => <FlashProductCard key={p.id} p={p} onMenu={(e) => openMenu(p, e)} />)
        )}
      </ScrollView>
      <BottomFade />

      {/* ⋯ menu — same anchored morph card as the Flash Sale section.
          Not-joined results get "เพิ่มเข้า Flash Sale" → pick a round → add;
          the result row flips to its joined form when done. */}
      <FlashCardMenu
        product={menuFor}
        anchor={menuAnchor}
        onClose={() => setMenuFor(null)}
        onEdit={(p) =>
          nav.navigate("FlashAddProduct", {
            edit: p,
            onDone: (np) => setItems((prev) => prev.map((x) => (x.id === np.id ? np : x))),
          })
        }
        onAdd={(p) =>
          nav.navigate("FlashSelectEvent", {
            preselect: p,
            onPicked: (np, evId, running) =>
              setItems((prev) => [
                { ...np, eventId: evId, status: running ? "active" : "scheduled" },
                ...prev.filter((x) => x.id !== np.id),
              ]),
          })
        }
      />
    </View>
  );
}
