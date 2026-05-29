import { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Image,
  Dimensions,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  Check,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Trash2,
} from "lucide-react-native";
import type { RootStackParamList } from "../navigation/RootStack";
import { PageHeader } from "../components/PageHeader";
import { EmptyState } from "../components/EmptyState";
import { BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";

type Nav = NativeStackNavigationProp<RootStackParamList>;

const SCREEN_WIDTH =
  Platform.OS === "web"
    ? Math.min(Dimensions.get("window").width, 430)
    : Dimensions.get("window").width;

type CartItem = {
  id: string;
  name: string;
  option: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  inStock: boolean;
  image: number;
};

type Shop = {
  name: string;
  items: CartItem[];
};

// Mock shop + cart data — replace with cart context once backend exists.
const MOCK_SHOPS: Shop[] = [
  {
    name: "METAHERB Store",
    items: [
      {
        id: "c1",
        name: "อบเชยเทศ Cinnamon Varum 150g",
        option: "ขนาด 150g",
        price: 199,
        originalPrice: 330,
        quantity: 2,
        inStock: true,
        image: require("../../assets/products/cinnamon.png"),
      },
      {
        id: "c2",
        name: "เมต้าเฮิร์บ ยาดมสมุนไพร แดง+น้ำเงิน",
        option: "เซต 2 ขวด",
        price: 89,
        originalPrice: 150,
        quantity: 1,
        inStock: true,
        image: require("../../assets/products/herb-jar.png"),
      },
    ],
  },
  {
    name: "สมุนไพรบ้านสวน",
    items: [
      {
        id: "c3",
        name: "กาแฟดริป Dark Roast Arabica 9 ซอง",
        option: "Dark Roast",
        price: 220,
        originalPrice: 320,
        quantity: 1,
        inStock: false,
        image: require("../../assets/products/coffee.png"),
      },
    ],
  },
];

export function CartScreen() {
  const nav = useNavigation<Nav>();
  const [shops] = useState<Shop[]>(MOCK_SHOPS);
  const allItems = useMemo(() => shops.flatMap((s) => s.items), [shops]);
  const inStockIds = useMemo(
    () => new Set(allItems.filter((i) => i.inStock).map((i) => i.id)),
    [allItems],
  );

  // Selection state — Set of item IDs the user has ticked.
  const [selected, setSelected] = useState<Set<string>>(() => new Set(inStockIds));
  // Quantity state — id → quantity. Initialised from mock data.
  const [quantities, setQuantities] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    allItems.forEach((i) => (init[i.id] = i.quantity));
    return init;
  });
  // Removed items — track to remove without mutating state arrays.
  const [removed, setRemoved] = useState<Set<string>>(() => new Set());

  const visibleShops = useMemo(
    () =>
      shops
        .map((s) => ({
          ...s,
          items: s.items.filter((i) => !removed.has(i.id)),
        }))
        .filter((s) => s.items.length > 0),
    [shops, removed],
  );

  const visibleInStockItems = useMemo(
    () => visibleShops.flatMap((s) => s.items).filter((i) => i.inStock),
    [visibleShops],
  );

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

  const updateQty = (id: string, delta: number) => {
    setQuantities((prev) => {
      const current = prev[id] ?? 1;
      const next = Math.max(1, Math.min(99, current + delta));
      return { ...prev, [id]: next };
    });
  };

  const removeItem = (id: string) => {
    setRemoved((prev) => new Set(prev).add(id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const removeSelected = () => {
    setRemoved((prev) => {
      const next = new Set(prev);
      selected.forEach((id) => next.add(id));
      return next;
    });
    setSelected(new Set());
  };

  // Pricing math (selected items only).
  const selectedItems = visibleInStockItems.filter((i) => selected.has(i.id));
  const selectedCount = selectedItems.length;
  const subtotal = selectedItems.reduce(
    (sum, i) => sum + i.price * (quantities[i.id] ?? 1),
    0,
  );
  const originalTotal = selectedItems.reduce(
    (sum, i) => sum + (i.originalPrice ?? i.price) * (quantities[i.id] ?? 1),
    0,
  );
  const discount = Math.max(0, originalTotal - subtotal);
  const grandTotal = subtotal;

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <PageHeader
        title="ตะกร้าสินค้า"
        subtitle={`(${visibleInStockItems.length + visibleShops.flatMap((s) => s.items).filter((i) => !i.inStock).length})`}
      />

      {visibleShops.length === 0 ? (
        <View className="flex-1 justify-center">
          <EmptyState
            icon={<ShoppingBag size={36} color="#9ca3af" />}
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
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 110 }}
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
                      style={{ padding: 4 }}
                    >
                      <Checkbox checked={allShopSelected} />
                    </Pressable>
                    <View
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 11,
                        backgroundColor: "#319754",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <ShoppingBag size={12} color="white" />
                    </View>
                    <Text
                      numberOfLines={1}
                      style={{
                        flex: 1,
                        fontSize: 13,
                        fontWeight: "500",
                        color: "#0a0a0a",
                        lineHeight: 18,
                      }}
                    >
                      {shop.name}
                    </Text>
                    <View
                      style={{
                        backgroundColor: "#319754",
                        paddingHorizontal: 6,
                        paddingVertical: 2,
                        borderRadius: 4,
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

                  {/* Items */}
                  {shop.items.map((item, idx) => (
                    <View
                      key={item.id}
                      style={{
                        paddingHorizontal: 16,
                        paddingVertical: 12,
                        borderBottomWidth: idx === shop.items.length - 1 ? 0 : 1,
                        borderBottomColor: "#f5f5f5",
                      }}
                    >
                      <View className="flex-row" style={{ gap: 12 }}>
                        <Pressable
                          onPress={() => toggleItem(item.id, item.inStock)}
                          hitSlop={14}
                          disabled={!item.inStock}
                          style={{ paddingTop: 28, padding: 4 }}
                        >
                          <Checkbox
                            checked={selected.has(item.id)}
                            disabled={!item.inStock}
                          />
                        </Pressable>
                        <View
                          style={{
                            width: 76,
                            height: 76,
                            borderRadius: 8,
                            backgroundColor: "#f5f5f5",
                            overflow: "hidden",
                          }}
                        >
                          <Image
                            source={item.image}
                            style={{
                              width: "100%",
                              height: "100%",
                              opacity: item.inStock ? 1 : 0.45,
                            }}
                            resizeMode="cover"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <View className="flex-row" style={{ gap: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text
                                numberOfLines={2}
                                style={{
                                  fontSize: 13,
                                  color: item.inStock ? "#0a0a0a" : "#a3a3a3",
                                  lineHeight: 18,
                                }}
                              >
                                {item.name}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: TEXT_MUTED,
                                  marginTop: 2,
                                  lineHeight: 14,
                                }}
                              >
                                {item.option}
                              </Text>
                              {!item.inStock ? (
                                <View
                                  style={{
                                    alignSelf: "flex-start",
                                    marginTop: 4,
                                    backgroundColor: "#e5e7eb",
                                    paddingHorizontal: 6,
                                    paddingVertical: 2,
                                    borderRadius: 4,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 10,
                                      color: "#6b7280",
                                      fontWeight: "500",
                                      lineHeight: 13,
                                    }}
                                  >
                                    สินค้าหมด
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                            <Pressable
                              onPress={() => removeItem(item.id)}
                              hitSlop={14}
                              className="active:opacity-60"
                              style={{
                                width: 32,
                                height: 32,
                                alignItems: "center",
                                justifyContent: "center",
                                marginTop: -6,
                                marginRight: -6,
                              }}
                            >
                              <Trash2 size={18} color="#a3a3a3" />
                            </Pressable>
                          </View>

                          {/* Qty stepper + price */}
                          <View
                            className="flex-row items-center justify-between"
                            style={{ marginTop: 10 }}
                          >
                            {item.inStock ? (
                              <View
                                className="flex-row items-center"
                                style={{
                                  borderWidth: 1,
                                  borderColor: "#e5e7eb",
                                  borderRadius: 8,
                                  overflow: "hidden",
                                }}
                              >
                                {/* Fitts's Law: visual 36px + hitSlop 8 = ~52px
                                    effective tap target, comfortably above the
                                    44dp HIG minimum. */}
                                <Pressable
                                  onPress={() => updateQty(item.id, -1)}
                                  hitSlop={8}
                                  disabled={(quantities[item.id] ?? 1) <= 1}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: (quantities[item.id] ?? 1) <= 1 ? 0.4 : 1,
                                  }}
                                >
                                  <Minus size={16} color="#0a0a0a" />
                                </Pressable>
                                <View
                                  style={{
                                    width: 44,
                                    height: 36,
                                    alignItems: "center",
                                    justifyContent: "center",
                                    borderLeftWidth: 1,
                                    borderRightWidth: 1,
                                    borderColor: "#e5e7eb",
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      fontWeight: "600",
                                      color: "#0a0a0a",
                                      lineHeight: 18,
                                    }}
                                  >
                                    {quantities[item.id] ?? 1}
                                  </Text>
                                </View>
                                <Pressable
                                  onPress={() => updateQty(item.id, 1)}
                                  hitSlop={8}
                                  style={{
                                    width: 36,
                                    height: 36,
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  <Plus size={16} color="#0a0a0a" />
                                </Pressable>
                              </View>
                            ) : (
                              <View />
                            )}
                            <View style={{ alignItems: "flex-end" }}>
                              {item.originalPrice ? (
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: TEXT_MUTED,
                                    textDecorationLine: "line-through",
                                    lineHeight: 14,
                                  }}
                                >
                                  ฿{(item.originalPrice * (quantities[item.id] ?? 1)).toFixed(0)}
                                </Text>
                              ) : null}
                              <Text
                                style={{
                                  fontSize: 16,
                                  fontWeight: "700",
                                  color: "#ee4d2d",
                                  lineHeight: 20,
                                }}
                              >
                                ฿{(item.price * (quantities[item.id] ?? 1)).toFixed(0)}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}

                </View>
              );
            })}

            {/* Summary card */}
            <View className="bg-white" style={{ marginTop: 8, padding: 16 }}>
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: "600",
                  color: "#0a0a0a",
                  marginBottom: 12,
                  lineHeight: 20,
                }}
              >
                สรุปคำสั่งซื้อ
              </Text>
              {(() => {
                const rows: Array<[string, string, string]> = [
                  ["รายการที่เลือก", `${selectedCount} รายการ`, "#319754"],
                  [
                    `ยอดสินค้า (${selectedItems.reduce((s, i) => s + (quantities[i.id] ?? 1), 0)} ชิ้น)`,
                    `฿${subtotal.toFixed(0)}`,
                    "#0a0a0a",
                  ],
                ];
                if (discount > 0) {
                  rows.push(["ส่วนลด", `-฿${discount.toFixed(0)}`, "#ee4d2d"]);
                }
                rows.push(["ค่าจัดส่ง", "ฟรี", "#319754"]);
                return rows.map(([label, val, color]) => (
                  <View
                    key={label}
                    className="flex-row items-center justify-between"
                    style={{ marginBottom: 8 }}
                  >
                    <Text style={{ fontSize: 13, color: "#525252", lineHeight: 18 }}>
                      {label}
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color,
                        fontWeight: "500",
                        lineHeight: 18,
                      }}
                    >
                      {val}
                    </Text>
                  </View>
                ));
              })()}
              <View
                className="flex-row items-center justify-between"
                style={{
                  borderTopWidth: 1,
                  borderTopColor: "#f0f0f0",
                  marginTop: 8,
                  paddingTop: 12,
                }}
              >
                <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a", lineHeight: 18 }}>
                  รวมทั้งสิ้น
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: "#ee4d2d",
                    lineHeight: 26,
                  }}
                >
                  ฿{grandTotal.toFixed(0)}
                </Text>
              </View>
              <View
                className="flex-row items-center"
                style={{ marginTop: 12, gap: 6 }}
              >
                <ShieldCheck size={14} color="#319754" />
                <Text style={{ fontSize: 11, color: "#525252", lineHeight: 14 }}>
                  คุ้มครองการสั่งซื้อโดย METAHERB
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky bottom checkout bar */}
          <SafeAreaView edges={["bottom"]} className="bg-white border-t border-gray-200">
            <View
              className="flex-row items-center"
              style={{ paddingHorizontal: 16, paddingVertical: 10, gap: 12 }}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: "#737373", lineHeight: 16 }}>
                  รวม{" "}
                  <Text style={{ color: "#0a0a0a", fontWeight: "500" }}>
                    {selectedCount}
                  </Text>{" "}
                  รายการ
                </Text>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: "700",
                    color: "#ee4d2d",
                    lineHeight: 28,
                    marginTop: 4,
                  }}
                >
                  ฿{grandTotal.toFixed(0)}
                </Text>
              </View>
              {/* Continue shopping — secondary outline */}
              <Pressable
                onPress={() => nav.goBack()}
                className="active:opacity-70"
                style={{
                  paddingHorizontal: 14,
                  height: 44,
                  borderRadius: 9999,
                  borderWidth: 1,
                  borderColor: "#319754",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: BRAND_GREEN_DARK,
                    fontSize: 13,
                    fontWeight: "600",
                    lineHeight: 18,
                  }}
                >
                  ช็อปปิ้งต่อ
                </Text>
              </Pressable>

              {/* Pay — primary CTA */}
              <Pressable
                onPress={() => selectedCount > 0 && nav.navigate("Payment")}
                disabled={selectedCount === 0}
                className="active:opacity-80"
                style={{
                  backgroundColor: selectedCount === 0 ? "#d4d4d4" : "#319754",
                  paddingHorizontal: 16,
                  height: 44,
                  borderRadius: 9999,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Text
                  style={{
                    color: "white",
                    fontSize: 13,
                    fontWeight: "600",
                    lineHeight: 18,
                  }}
                >
                  ชำระเงิน ({selectedCount})
                </Text>
              </Pressable>
            </View>
          </SafeAreaView>
        </>
      )}
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
  return (
    <View
      style={{
        width: 20,
        height: 20,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: disabled ? "#d4d4d4" : checked ? "#319754" : "#a3a3a3",
        backgroundColor: checked ? "#319754" : "transparent",
        opacity: disabled ? 0.5 : 1,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {checked ? <Check size={14} color="white" strokeWidth={3} /> : null}
    </View>
  );
}
