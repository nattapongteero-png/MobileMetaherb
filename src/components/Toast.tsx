/* ============================================================================
 *  Reusable global toast. Mount <ToastHost /> once near the app root, then call
 *  showToast("...") from anywhere — no props/threading needed.
 *
 *    import { showToast } from "../components/Toast";
 *    showToast("บันทึกเรียบร้อย");                 // success (default)
 *    showToast("เกิดข้อผิดพลาด", "error");
 *  ========================================================================== */
import { useEffect, useRef, useState } from "react";
import { Animated, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, AlertCircle, Info } from "lucide-react-native";

type ToastType = "success" | "error" | "info";
type ToastItem = { id: number; message: string; type: ToastType };

const listeners = new Set<(t: ToastItem) => void>();
let counter = 0;

export function showToast(message: string, type: ToastType = "success") {
  const item: ToastItem = { id: ++counter, message, type };
  listeners.forEach((l) => l(item));
}

const STYLE: Record<ToastType, { bg: string; Icon: typeof Check }> = {
  success: { bg: "#16a34a", Icon: Check },
  error: { bg: "#dc2626", Icon: AlertCircle },
  info: { bg: "#1a1a1a", Icon: Info },
};

export function ToastHost() {
  const [item, setItem] = useState<ToastItem | null>(null);
  const y = useRef(new Animated.Value(-90)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const l = (t: ToastItem) => setItem(t);
    listeners.add(l);
    return () => { listeners.delete(l); };
  }, []);

  useEffect(() => {
    if (!item) return;
    y.setValue(-90);
    opacity.setValue(0);
    Animated.parallel([
      Animated.spring(y, { toValue: 0, useNativeDriver: true, friction: 8, tension: 70 }),
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(y, { toValue: -90, duration: 220, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
      ]).start(() => setItem(null));
    }, 2500);
    return () => clearTimeout(t);
  }, [item, opacity, y]);

  if (!item) return null;
  const cfg = STYLE[item.type];
  return (
    <Animated.View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 9999, transform: [{ translateY: y }], opacity }}>
      <SafeAreaView edges={["top"]}>
        <View
          style={{
            marginHorizontal: 16,
            marginTop: 8,
            flexDirection: "row",
            alignItems: "center",
            gap: 10,
            backgroundColor: "#fff",
            borderRadius: 14,
            paddingHorizontal: 14,
            paddingVertical: 12,
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 6 },
            shadowOpacity: 0.16,
            shadowRadius: 16,
            elevation: 8,
          }}
        >
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center" }}>
            <cfg.Icon size={15} color="#fff" strokeWidth={2.6} />
          </View>
          <Text style={{ flex: 1, fontSize: 13.5, fontWeight: "600", color: "#1a1a1a" }}>{item.message}</Text>
        </View>
      </SafeAreaView>
    </Animated.View>
  );
}
