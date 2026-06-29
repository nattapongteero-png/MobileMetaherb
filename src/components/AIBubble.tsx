import { View, Text, Pressable } from "react-native";
import type { NavigationContainerRef } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles } from "lucide-react-native";
import { useAIAssistant } from "../context/AIAssistantContext";
import type { RootStackParamList } from "../navigation/RootStack";

const AI_GRAD = ["#0088ff", "#6366f1", "#9747ff"] as const;
// Don't float the orb on the assistant itself / auth / its own history.
const HIDE = new Set(["AIAssistant", "AIHistory", "Login", "Register"]);

/** Build a short context note from the current screen so เมต้า knows what the user is looking at. */
function contextFor(name?: string, params?: object): string | undefined {
  if (name === "ProductDetail") {
    const p = (params as { product?: { id: string; name: string; price: number } } | undefined)?.product;
    if (p) return `สินค้า "${p.name}" (id ${p.id}, ราคา ฿${p.price})`;
  }
  return undefined;
}

/**
 * Global floating "เมต้า" AI button — lives over every screen (rendered once in App).
 * Opens the AIAssistant and passes the current screen as context (e.g. the product
 * being viewed) so "ตัวนี้กินยังไง" / "มีถูกกว่าไหม" just work.
 */
export function AIBubble({
  navRef,
  routeName,
  routeParams,
  bottom = 110,
  right = 16,
}: {
  navRef: NavigationContainerRef<RootStackParamList>;
  routeName?: string;
  routeParams?: object;
  bottom?: number;
  right?: number;
}) {
  const { unreadCount } = useAIAssistant();
  if (!routeName || HIDE.has(routeName)) return null;
  const context = contextFor(routeName, routeParams);

  return (
    <Pressable
      onPress={() => navRef.navigate("AIAssistant", context ? { context } : undefined)}
      accessibilityLabel="ผู้ช่วย AI เมต้า"
      hitSlop={8}
      style={({ pressed }) => ({ position: "absolute", bottom, right, zIndex: 50, transform: [{ scale: pressed ? 0.94 : 1 }] })}
    >
      <LinearGradient
        colors={AI_GRAD}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", shadowColor: "#6366f1", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 12, elevation: 8 }}
      >
        <Sparkles size={26} color="#fff" strokeWidth={2} />
      </LinearGradient>
      {unreadCount > 0 ? (
        <View style={{ position: "absolute", top: -4, right: -4, minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: 10, backgroundColor: "#ef4444", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" }}>
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#fff", lineHeight: 14 }}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}
