import { View, Text, Pressable, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { MessageCircle } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { ShopAvatar } from "../components/ShopAvatar";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { useChat } from "../context/ChatContext";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

export function ChatListScreen() {
  const nav = useNavigation<Nav>();
  const { conversations } = useChat();

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="แชทกับร้านค้า" onBack={() => nav.canGoBack() && nav.goBack()} onCart={() => nav.navigate("Cart")} showSearch={false} />
      <View style={{ flex: 1 }}>
        {conversations.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingBottom: 60 }}>
            <MessageCircle size={56} color="#d4d4d4" strokeWidth={1.5} />
            <Text style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>ยังไม่มีการสนทนา</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
            <View style={{ backgroundColor: "#fff", marginTop: 8 }}>
              {conversations.map((c, i) => (
                <View key={c.id}>
                  {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0", marginLeft: 76 }} /> : null}
                  <Pressable
                    onPress={() => nav.navigate("Chat", { shopId: c.id, shopName: c.shopName })}
                    className="flex-row items-center active:opacity-70"
                    style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 12 }}
                  >
                    {/* Real shop avatar + online dot */}
                    <View>
                      <ShopAvatar name={c.shopName} size={48} />
                      {c.online ? (
                        <View style={{ position: "absolute", right: 0, bottom: 0, width: 13, height: 13, borderRadius: 7, backgroundColor: "#22c55e", borderWidth: 2, borderColor: "#fff" }} />
                      ) : null}
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <Text style={{ fontSize: 15, fontWeight: c.unread > 0 ? "700" : "600", color: "#0a0a0a", flex: 1 }} numberOfLines={1}>{c.shopName}</Text>
                        <Text style={{ fontSize: 11.5, color: c.unread > 0 ? BRAND_GREEN : TEXT_MUTED }}>{c.time}</Text>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 2 }}>
                        <Text style={{ fontSize: 13, color: c.unread > 0 ? "#0a0a0a" : TEXT_MUTED, flex: 1 }} numberOfLines={1}>{c.lastMessage}</Text>
                        {c.unread > 0 ? (
                          <View style={{ minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: 10, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff", lineHeight: 15 }}>{c.unread > 99 ? "99+" : c.unread}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                </View>
              ))}
            </View>
          </ScrollView>
        )}
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>
    </View>
  );
}
