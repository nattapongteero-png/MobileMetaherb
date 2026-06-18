import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Platform,
  Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Check,
  MessageCircle,
  Minus,
  PackageX,
  Plus,
  SearchX,
  ShoppingCart,
  Trash2,
} from "lucide-react-native";
import type { RootStackParamList } from "../navigation/RootStack";
import { BottomFade } from "../components/BottomFade";
import { EmptyState } from "../components/EmptyState";
import { ShopAvatar } from "../components/ShopAvatar";
import { SubPageHeader } from "../components/SubPageHeader";
import { CheckoutSheet, type CheckoutSheetHandle } from "../components/CheckoutSheet";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import { useCart, type CartItem } from "../context/CartContext";
import { getShop } from "../data/shops";
import type { Product } from "../types/Product";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH =
  Platform.OS === "web"
    ? Math.min(Dimensions.get("window").width, 430)
    : Dimensions.get("window").width;

/** Build a navigable Product from a cart line so tapping a row opens its detail
 *  page. The cart stores only a subset of Product fields, so rating is borrowed
 *  from the shop and discountPercent is derived from the original price. */
function cartItemToProduct(item: CartItem): Product {
  return {
    id: item.id,
    name: item.name,
    price: item.price,
    originalPrice: item.originalPrice,
    discountPercent: item.originalPrice
      ? Math.round((1 - item.price / item.originalPrice) * 100)
      : undefined,
    rating: getShop(item.shop).rating,
    sold: "ขายดี",
    image: item.image,
  };
}

type CartItemRowProps = {
  item: CartItem;
  isLast: boolean;
  selected: boolean;
  onToggle: () => void;
  onOpen: () => void;
  onQty: (n: number) => void;
  onRemove: () => void;
};

/** A single cart line — shared by the per-shop sections and the out-of-stock
 *  section. Out-of-stock items render disabled (no checkbox/stepper, dimmed). */
function CartItemRow({ item, isLast, selected, onToggle, onOpen, onQty, onRemove }: CartItemRowProps) {
  return (
    <View
      style={{
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: "#f5f5f5",
      }}
    >
      <View className="flex-row" style={{ gap: 12 }}>
        <Pressable
          onPress={onToggle}
          hitSlop={14}
          disabled={!item.inStock}
          style={{ paddingTop: 28, paddingBottom: 4 }}
        >
          <Checkbox checked={selected} disabled={!item.inStock} />
        </Pressable>
        <Pressable
          onPress={onOpen}
          className="active:opacity-80"
          accessibilityLabel={`ดูรายละเอียด ${item.name}`}
          style={{ width: 76, height: 76, borderRadius: 8, backgroundColor: "#f5f5f5", overflow: "hidden" }}
        >
          <Image
            source={item.image}
            style={{ width: "100%", height: "100%", opacity: item.inStock ? 1 : 0.45 }}
            resizeMode="cover"
          />
        </Pressable>
        <View style={{ flex: 1 }}>
          <View className="flex-row" style={{ gap: 8 }}>
            <Pressable onPress={onOpen} className="active:opacity-60" style={{ flex: 1 }}>
              <Text
                numberOfLines={2}
                style={{ fontSize: 13, color: item.inStock ? "#0a0a0a" : "#a3a3a3", lineHeight: 18 }}
              >
                {item.name}
              </Text>
              <Text style={{ fontSize: 11, color: TEXT_MUTED, marginTop: 2, lineHeight: 14 }}>
                {item.option}
              </Text>
            </Pressable>
            <Pressable
              onPress={onRemove}
              hitSlop={14}
              className="active:opacity-60"
              style={{ width: 32, height: 32, alignItems: "center", justifyContent: "center", marginTop: -6, marginRight: -6 }}
            >
              <Trash2 size={18} color="#a3a3a3" />
            </Pressable>
          </View>

          {/* In-stock: qty stepper + price. Out-of-stock: status tag + price. */}
          <View className="flex-row items-center justify-between" style={{ marginTop: 10 }}>
            {item.inStock ? (
              <QtyStepper quantity={item.quantity} onChange={onQty} />
            ) : (
              <View
                style={{ backgroundColor: "#e5e7eb", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}
              >
                <Text style={{ fontSize: 11, color: "#6b7280", fontWeight: "500", lineHeight: 14 }}>
                  สินค้าหมด
                </Text>
              </View>
            )}
            <View style={{ alignItems: "flex-end" }}>
              {item.originalPrice ? (
                <Text
                  style={{ fontSize: 11, color: TEXT_MUTED, textDecorationLine: "line-through", lineHeight: 14 }}
                >
                  ฿{(item.originalPrice * item.quantity).toFixed(0)}
                </Text>
              ) : null}
              <Text style={{ fontSize: 16, fontWeight: "700", color: "#ee4d2d", lineHeight: 20 }}>
                ฿{(item.price * item.quantity).toFixed(0)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

export function CartScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { items, updateQty, removeItem, removeMany } = useCart();

  // Search — filters the displayed rows by product name or shop. Selection and
  // pricing keep operating on the full cart so the checkout total stays stable
  // while the user is just narrowing the view.
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const filteredItems = useMemo(
    () =>
      q
        ? items.filter(
            (i) =>
              i.name.toLowerCase().includes(q) ||
              i.shop.toLowerCase().includes(q),
          )
        : items,
    [items, q],
  );

  // Group IN-STOCK cart lines into shops (preserve first-seen order). Out-of-
  // stock lines are pulled out into their own section at the very bottom.
  const visibleShops = useMemo(() => {
    const order: string[] = [];
    const byShop: Record<string, CartItem[]> = {};
    filteredItems
      .filter((i) => i.inStock)
      .forEach((i) => {
        if (!byShop[i.shop]) {
          byShop[i.shop] = [];
          order.push(i.shop);
        }
        byShop[i.shop].push(i);
      });
    return order.map((name) => ({ name, items: byShop[name] }));
  }, [filteredItems]);

  // All unavailable lines, regardless of shop — rendered last, always.
  const outOfStockItems = useMemo(
    () => filteredItems.filter((i) => !i.inStock),
    [filteredItems],
  );

  const visibleInStockItems = useMemo(() => items.filter((i) => i.inStock), [items]);

  // Selection — ticked item IDs. New in-stock items auto-tick; gone IDs prune.
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(items.filter((i) => i.inStock).map((i) => i.id)),
  );
  const knownIds = useRef<Set<string>>(new Set(items.map((i) => i.id)));
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set(prev);
      items.forEach((i) => {
        if (!knownIds.current.has(i.id)) {
          if (i.inStock) next.add(i.id);
          knownIds.current.add(i.id);
        }
      });
      [...next].forEach((id) => {
        if (!items.some((i) => i.id === id)) next.delete(id);
      });
      return next;
    });
  }, [items]);

  const allSelected =
    visibleInStockItems.length > 0 &&
    visibleInStockItems.every((i) => selected.has(i.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleInStockItems.map((i) => i.id)));
    }
  };

  const toggleItem = (id: string, inStock: boolean) => {
    if (!inStock) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleShop = (shopName: string) => {
    const shopItems = visibleShops.find((s) => s.name === shopName)?.items ?? [];
    const inStockShopItems = shopItems.filter((i) => i.inStock);
    const allShopSelected = inStockShopItems.every((i) => selected.has(i.id));
    setSelected((prev) => {
      const next = new Set(prev);
      inStockShopItems.forEach((i) => {
        if (allShopSelected) next.delete(i.id);
        else next.add(i.id);
      });
      return next;
    });
  };

  const removeSelected = () => {
    removeMany([...selected]);
    setSelected(new Set());
  };

  const openProduct = (item: CartItem) =>
    nav.navigate("ProductDetail", { product: cartItemToProduct(item) });

  // Collapse the checkout sheet as soon as the user scrolls to browse the list.
  const sheetRef = useRef<CheckoutSheetHandle>(null);

  // Pricing math (selected items only) — quantities live in the cart context.
  const selectedItems = visibleInStockItems.filter((i) => selected.has(i.id));
  const selectedCount = selectedItems.length;
  const selectedPieces = selectedItems.reduce((s, i) => s + i.quantity, 0);
  // Distinct suppliers in the selection — a PR is raised per supplier.
  const supplierCount = new Set(selectedItems.map((i) => i.shop)).size;
  const subtotal = selectedItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const originalTotal = selectedItems.reduce(
    (sum, i) => sum + (i.originalPrice ?? i.price) * i.quantity,
    0,
  );
  const discount = Math.max(0, originalTotal - subtotal);
  const grandTotal = subtotal;

  const totalQty = useMemo(
    () => items.reduce((s, i) => s + i.quantity, 0),
    [items],
  );

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader
        title="ตะกร้าสินค้า"
        subtitle={totalQty > 0 ? `${totalQty} ชิ้นในตะกร้า` : "ตะกร้ายังว่างอยู่"}
        onBack={() => nav.canGoBack() && nav.goBack()}
        query={query}
        onChangeQuery={setQuery}
        searchPlaceholder="ค้นหาในตะกร้า..."
      />

      {items.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            icon={<ShoppingCart size={36} color="#9ca3af" />}
            title="ตะกร้ายังว่างอยู่"
            subtitle="ลองช้อปสินค้าที่คุณสนใจ"
            action={
              <Pressable
                onPress={() => nav.goBack()}
                className="active:opacity-80"
                style={{
                  backgroundColor: "#319754",
                  paddingHorizontal: 32,
                  paddingVertical: 10,
                  borderRadius: 9999,
                }}
              >
                <Text style={{ color: "white", fontSize: 14, fontWeight: "500", lineHeight: 18 }}>
                  ช้อปเลย
                </Text>
              </Pressable>
            }
          />
        </View>
      ) : visibleShops.length === 0 && outOfStockItems.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            icon={<SearchX size={36} color="#9ca3af" />}
            title="ไม่พบสินค้าในตะกร้า"
            subtitle="ลองเปลี่ยนคำค้นหา"
          />
        </View>
      ) : (
        <>
          <View style={{ flex: 1 }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 110 + insets.bottom }}
            onScrollBeginDrag={() => sheetRef.current?.collapse()}
          >
            {/* Select-all bar */}
            <View
              className="bg-white border-b border-gray-100 flex-row items-center justify-between"
              style={{ paddingHorizontal: 16, paddingVertical: 12, marginTop: 8 }}
            >
              <Pressable
                onPress={toggleAll}
                hitSlop={12}
                className="flex-row items-center active:opacity-60"
                style={{ gap: 10, flex: 1, paddingVertical: 4 }}
              >
                <Checkbox checked={allSelected} />
                <Text style={{ fontSize: 14, color: "#0a0a0a", lineHeight: 18 }}>
                  เลือกทั้งหมด ({visibleInStockItems.length} รายการ)
                </Text>
              </Pressable>
              {selected.size > 0 ? (
                <Pressable
                  onPress={removeSelected}
                  hitSlop={10}
                  className="active:opacity-60"
                  style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                >
                  <Text style={{ fontSize: 13, color: "#ef4444", lineHeight: 18 }}>
                    ลบ {selected.size} รายการ
                  </Text>
                </Pressable>
              ) : null}
            </View>

            {/* Shop groups */}
            {visibleShops.map((shop) => {
              const shopInStock = shop.items.filter((i) => i.inStock);
              const allShopSelected =
                shopInStock.length > 0 &&
                shopInStock.every((i) => selected.has(i.id));

              return (
                <View
                  key={shop.name}
                  className="bg-white"
                  style={{ marginTop: 8 }}
                >
                  {/* Shop header */}
                  <View
                    className="flex-row items-center"
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      backgroundColor: "#fafafa",
                      borderBottomWidth: 1,
                      borderBottomColor: "#f0f0f0",
                      gap: 10,
                    }}
                  >
                    <Pressable
                      onPress={() => toggleShop(shop.name)}
                      hitSlop={14}
                      style={{ paddingVertical: 4 }}
                    >
                      <Checkbox checked={allShopSelected} />
                    </Pressable>
                    <ShopAvatar name={shop.name} size={32} />
                    <View className="flex-row items-center" style={{ flex: 1, gap: 6 }}>
                      <Text
                        numberOfLines={1}
                        style={{
                          flexShrink: 1,
                          fontSize: 13,
                          fontWeight: "500",
                          color: "#0a0a0a",
                          lineHeight: 18,
                        }}
                      >
                        {shop.name}
                      </Text>
                      {/* "แนะนำ" pill — oval, hugging the shop name. */}
                      <View
                        style={{
                          backgroundColor: "#319754",
                          paddingHorizontal: 8,
                          paddingVertical: 2,
                          borderRadius: 999,
                        }}
                      >
                        <Text
                          style={{
                            color: "white",
                            fontSize: 9,
                            fontWeight: "600",
                            lineHeight: 12,
                          }}
                        >
                          แนะนำ
                        </Text>
                      </View>
                    </View>

                    {/* Chat with this shop — opens the store thread. */}
                    <Pressable
                      onPress={() => nav.navigate("Chat")}
                      hitSlop={10}
                      className="flex-row items-center active:opacity-60"
                      accessibilityLabel={`แชทกับ ${shop.name}`}
                      style={{ gap: 4, paddingLeft: 4 }}
                    >
                      <MessageCircle size={18} color="#319754" strokeWidth={2} />
                      <Text style={{ fontSize: 12, color: BRAND_GREEN_DARK, fontWeight: "500", lineHeight: 16 }}>
                        แชท
                      </Text>
                    </Pressable>
                  </View>

                  {/* Items */}
                  {shop.items.map((item, idx) => (
                    <CartItemRow
                      key={item.id}
                      item={item}
                      isLast={idx === shop.items.length - 1}
                      selected={selected.has(item.id)}
                      onToggle={() => toggleItem(item.id, item.inStock)}
                      onOpen={() => openProduct(item)}
                      onQty={(n) => updateQty(item.id, n)}
                      onRemove={() => removeItem(item.id)}
                    />
                  ))}
                </View>
              );
            })}

            {/* Out-of-stock section — all unavailable items, every shop pooled
                together, pinned to the bottom of the list. */}
            {outOfStockItems.length > 0 ? (
              <View className="bg-white" style={{ marginTop: 8 }}>
                <View
                  className="flex-row items-center justify-between"
                  style={{
                    paddingHorizontal: 16,
                    paddingVertical: 10,
                    backgroundColor: "#fafafa",
                    borderBottomWidth: 1,
                    borderBottomColor: "#f0f0f0",
                  }}
                >
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <PackageX size={16} color="#9ca3af" strokeWidth={2} />
                    <Text style={{ fontSize: 13, fontWeight: "500", color: "#6b7280", lineHeight: 18 }}>
                      สินค้าที่หมด ({outOfStockItems.length})
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => removeMany(outOfStockItems.map((i) => i.id))}
                    hitSlop={10}
                    className="active:opacity-60"
                    style={{ paddingHorizontal: 8, paddingVertical: 4 }}
                  >
                    <Text style={{ fontSize: 13, color: "#ef4444", lineHeight: 18 }}>ลบทั้งหมด</Text>
                  </Pressable>
                </View>
                {outOfStockItems.map((item, idx) => (
                  <CartItemRow
                    key={item.id}
                    item={item}
                    isLast={idx === outOfStockItems.length - 1}
                    selected={false}
                    onToggle={() => {}}
                    onOpen={() => openProduct(item)}
                    onQty={() => {}}
                    onRemove={() => removeItem(item.id)}
                  />
                ))}
              </View>
            ) : null}

          </ScrollView>
            {/* Top fade — rows dissolve as they scroll up under the header. */}
            <LinearGradient
              pointerEvents="none"
              colors={["#fafafa", "rgba(250,250,250,0)"]}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
            />
            {/* Black scroll-edge shade at the very bottom of the screen. */}
            <BottomFade />
          </View>

          {/* Apple Maps-style floating sheet — drag the grabber up to expand
              the order summary; collapsed it shows total + pay. */}
          <CheckoutSheet
            ref={sheetRef}
            selectedCount={selectedCount}
            totalPieces={selectedPieces}
            subtotal={subtotal}
            discount={discount}
            grandTotal={grandTotal}
            payDisabled={selectedCount === 0}
            onPay={() => nav.navigate("Payment")}
            // TODO: wire to the real PR / RFQ flows once their destinations exist.
            onPR={() => {}}
            onRFQ={() => {}}
            supplierCount={supplierCount}
          />
        </>
      )}
    </View>
  );
}

// Springy +/- button — scales down on press for tactile feedback. Mirrors the
// StepButton on ProductDetailScreen so the control feels identical everywhere
// (Jakob's Law — learn the stepper once, use it on every surface).
function StepButton({
  onPress,
  disabled,
  children,
}: {
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const spring = (to: number) =>
    Animated.spring(scale, { toValue: to, useNativeDriver: true, friction: 5, tension: 220 }).start();
  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      disabled={disabled}
      onPressIn={() => {
        if (!disabled) spring(0.8);
      }}
      onPressOut={() => spring(1)}
    >
      <Animated.View
        style={{
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          opacity: disabled ? 0.4 : 1,
          transform: [{ scale }],
        }}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}

// Pill-shaped quantity stepper with a typable center field. Local text state
// lets the user clear and retype freely; it commits a clamped value on blur and
// re-syncs whenever the external quantity changes (e.g. via the +/- buttons).
function QtyStepper({
  quantity,
  onChange,
}: {
  quantity: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState(String(quantity));
  useEffect(() => {
    setText(String(quantity));
  }, [quantity]);

  return (
    <View
      className="flex-row items-center"
      style={{
        borderWidth: 1,
        borderColor: "#e5e7eb",
        borderRadius: 999,
        overflow: "hidden",
      }}
    >
      <StepButton onPress={() => onChange(quantity - 1)} disabled={quantity <= 1}>
        <Minus size={16} color="#0a0a0a" />
      </StepButton>
      <TextInput
        value={text}
        onChangeText={(t) => {
          const digits = t.replace(/[^0-9]/g, "");
          setText(digits);
          const n = parseInt(digits, 10);
          if (!Number.isNaN(n) && n >= 1) onChange(n);
        }}
        onEndEditing={() => {
          const n = parseInt(text, 10);
          const v = Number.isNaN(n) || n < 1 ? 1 : Math.min(99, n);
          setText(String(v));
          onChange(v);
        }}
        keyboardType="number-pad"
        selectTextOnFocus
        style={{
          width: 40,
          height: 36,
          textAlign: "center",
          fontSize: 14,
          fontWeight: "600",
          color: "#0a0a0a",
          padding: 0,
        }}
      />
      <StepButton onPress={() => onChange(quantity + 1)} disabled={quantity >= 99}>
        <Plus size={16} color="#0a0a0a" />
      </StepButton>
    </View>
  );
}

function Checkbox({
  checked,
  disabled,
}: {
  checked: boolean;
  disabled?: boolean;
}) {
  // Spring the tick in/out so toggling feels tactile (Doherty Threshold —
  // sub-400ms feedback). Drives both the check's scale and the fill's pop.
  const anim = useRef(new Animated.Value(checked ? 1 : 0)).current;
  useEffect(() => {
    Animated.spring(anim, {
      toValue: checked ? 1 : 0,
      useNativeDriver: true,
      friction: 6,
      tension: 240,
    }).start();
  }, [checked, anim]);

  return (
    <View
      style={{
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 1.5,
        borderColor: disabled ? "#d4d4d4" : checked ? BRAND_GREEN : "#c4c4c4",
        backgroundColor: checked ? BRAND_GREEN : "white",
        opacity: disabled ? 0.5 : 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Animated.View style={{ opacity: anim, transform: [{ scale: anim }] }}>
        <Check size={13} color="white" strokeWidth={3.5} />
      </Animated.View>
    </View>
  );
}
