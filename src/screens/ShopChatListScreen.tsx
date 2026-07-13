import { View, Text, ScrollView, Pressable } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MessageCircle, ChevronRight } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { EmptyState } from "../components/EmptyState";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { useStore } from "../store/db";
import { chatStore, lastMessageOf, threadsForShop, unreadTotalForShop } from "../store/chat";
import { timeAgo } from "../store/events";
import { METAHERB_SHOP } from "../data/shopOrders";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/**
 * กล่องข้อความลูกค้า (ฝั่งร้าน) — the seller's half of the conversation.
 *
 * This did not exist: ChatScreen answered every customer message with a random
 * canned line on a 1.5 s timer, and ShopManagerChatScreen is an AI copilot, not
 * an inbox. Both sides now read the shared thread; replying here lands in the
 * customer's chat and clears their "รอตอบกลับ".
 */
export function ShopChatListScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();

  useStore(chatStore);
  const threads = threadsForShop(METAHERB_SHOP);
  const unread = unreadTotalForShop(METAHERB_SHOP);

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="ข้อความจากลูกค้า"
        subtitle={unread > 0 ? `มี ${unread} ข้อความที่ยังไม่อ่าน` : "ตอบครบทุกข้อความแล้ว"}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      {threads.length === 0 ? (
        <EmptyState
          icon={<MessageCircle size={36} color="#9ca3af" />}
          title="ยังไม่มีข้อความ"
          subtitle="ข้อความที่ลูกค้าส่งมาจะขึ้นที่นี่"
        />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 + insets.bottom, gap: 12 }}>
          {threads.map((t) => {
            const last = lastMessageOf(t.id);
            const waiting = t.unreadShop > 0;
            return (
              <Pressable
                key={t.id}
                onPress={() => nav.navigate("Chat", { shopId: t.id, shopName: t.shopName, role: "shop" })}
                className="flex-row items-center active:opacity-80"
                style={{ backgroundColor: "#fff", borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: "#f0f0f0" }}
              >
                <View
                  style={{
                    width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center",
                    backgroundColor: waiting ? "rgba(49,151,84,0.12)" : "#f5f5f5",
                  }}
                >
                  <MessageCircle size={20} color={waiting ? BRAND_GREEN : "#9ca3af"} strokeWidth={2.2} />
                </View>

                <View style={{ flex: 1 }}>
                  <View className="flex-row items-center" style={{ gap: 8 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }} numberOfLines={1}>
                      {/* One buyer per thread in the mock; the id doubles as their handle. */}
                      ลูกค้า · {t.id}
                    </Text>
                    {waiting ? (
                      <View style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff" }}>{t.unreadShop}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 13, color: TEXT_MUTED, marginTop: 2 }} numberOfLines={1}>
                    {last ? (last.sender === "user" ? last.text || "ส่งรูปภาพ" : `คุณ: ${last.text || "ส่งรูปภาพ"}`) : "เริ่มต้นการสนทนา"}
                  </Text>
                </View>

                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>{last ? timeAgo(last.at) : ""}</Text>
                  <ChevronRight size={16} color="#c7c7cc" strokeWidth={2.4} />
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}
