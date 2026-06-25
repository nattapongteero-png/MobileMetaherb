import { View, Text, Pressable } from "react-native";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import { Sparkles } from "lucide-react-native";
import { useAIAssistant } from "../context/AIAssistantContext";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const AI_GRAD = ["#0088ff", "#6366f1", "#9747ff"] as const;

/** Floating "เมต้า" AI shopping-assistant button — opens the AIAssistant screen. */
export function AIBubble({ bottom = 110, right = 16 }: { bottom?: number; right?: number }) {
  const nav = useNavigation<Nav>();
  const { unreadCount } = useAIAssistant();
  return (
    <Pressable
      onPress={() => nav.navigate("AIAssistant")}
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
