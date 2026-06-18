import { Pressable } from "react-native";
import { GlassView } from "expo-glass-effect";
import { useNavigation } from "@react-navigation/native";
import { ChevronLeft } from "lucide-react-native";

/**
 * Circular Liquid Glass back button (iOS 26 UIGlassEffect via expo-glass-effect),
 * matching the round glass controls in Apple's Health app. Used as the native
 * stack header's headerLeft.
 */
export function GlassBackButton() {
  const nav = useNavigation();
  return (
    <Pressable onPress={() => nav.goBack()} hitSlop={10} accessibilityLabel="ย้อนกลับ">
      <GlassView
        glassEffectStyle="regular"
        colorScheme="light"
        isInteractive
        style={{ width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" }}
      >
        <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2.4} />
      </GlassView>
    </Pressable>
  );
}
