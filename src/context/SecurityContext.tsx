import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { View, Text, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { X, ShieldCheck } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PinDots, PinKeypad, errorHaptic } from "../components/PinPad";
import { LeafDecor } from "../components/LeafDecor";
import { BRAND_GREEN } from "../theme/tokens";

// Lazy require so a build WITHOUT the native module doesn't crash at import time
// (the call sites all null-check this; biometric simply no-ops until rebuilt).
let LocalAuthentication: typeof import("expo-local-authentication") | null = null;
try {
  LocalAuthentication = require("expo-local-authentication");
} catch {
  LocalAuthentication = null;
}

const STORAGE_KEY = "metaherb.pin";
const BIO_KEY = "metaherb.biometric";
const PIN_LENGTH = 6;

export type BiometricType = "face" | "fingerprint" | null;

type SecurityValue = {
  /** True once a PIN has been set. */
  pinEnabled: boolean;
  setPin: (pin: string) => void;
  disablePin: () => void;
  /** Prompt for the PIN (tries biometric first if enabled). Resolves true if verified. */
  requirePin: (reason?: string) => Promise<boolean>;
  /** Detected biometric on this device, or null if unsupported / not enrolled. */
  biometricType: BiometricType;
  /** Whether the user turned biometric unlock on. */
  biometricEnabled: boolean;
  setBiometricEnabled: (on: boolean) => void;
  /** Run a native Face ID / Touch ID prompt. Resolves true on success. */
  authenticateBiometric: (reason?: string) => Promise<boolean>;
};

/** "Face ID" / "ลายนิ้วมือ" label for a detected type. */
export const biometricLabel = (t: BiometricType): string =>
  t === "face" ? "Face ID" : t === "fingerprint" ? "ลายนิ้วมือ (Touch ID)" : "ไบโอเมตริก";

const SecurityContext = createContext<SecurityValue | null>(null);

export function SecurityProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [pin, setPinState] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // Verify-modal state
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState("");
  const [error, setError] = useState(false);
  const [reason, setReason] = useState<string | undefined>();
  const resolver = useRef<((ok: boolean) => void) | null>(null);
  const pinRef = useRef<string | null>(null);
  pinRef.current = pin;

  // Biometric
  const [biometricType, setBiometricType] = useState<BiometricType>(null);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const bioEnabledRef = useRef(false); bioEnabledRef.current = biometricEnabled;
  const bioTypeRef = useRef<BiometricType>(null); bioTypeRef.current = biometricType;

  useEffect(() => {
    AsyncStorage.multiGet([STORAGE_KEY, BIO_KEY]).then((entries) => {
      const map = Object.fromEntries(entries);
      if (map[STORAGE_KEY]) setPinState(map[STORAGE_KEY]);
      if (map[BIO_KEY] === "1") setBiometricEnabledState(true);
      setHydrated(true);
    });
    // Detect device biometric support (guarded — native may be absent until rebuild).
    (async () => {
      if (!LocalAuthentication) return;
      try {
        const [has, enrolled, types] = await Promise.all([
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
          LocalAuthentication.supportedAuthenticationTypesAsync(),
        ]);
        if (!has || !enrolled) return;
        if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) setBiometricType("face");
        else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) setBiometricType("fingerprint");
      } catch {
        /* local-authentication not in this build yet */
      }
    })();
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    if (pin) AsyncStorage.setItem(STORAGE_KEY, pin).catch(() => {});
    else AsyncStorage.removeItem(STORAGE_KEY).catch(() => {});
  }, [pin, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(BIO_KEY, biometricEnabled ? "1" : "0").catch(() => {});
  }, [biometricEnabled, hydrated]);

  const setPin = (p: string) => setPinState(p);
  const disablePin = () => { setPinState(null); setBiometricEnabledState(false); };
  const setBiometricEnabled = (on: boolean) => setBiometricEnabledState(on);

  const authenticateBiometric = async (r?: string) => {
    if (!LocalAuthentication) return false;
    try {
      const res = await LocalAuthentication.authenticateAsync({
        promptMessage: r ?? "ยืนยันตัวตน",
        cancelLabel: "ใช้ PIN",
        disableDeviceFallback: true,
      });
      return res.success;
    } catch {
      return false;
    }
  };

  const requirePin = async (r?: string) => {
    if (!pinRef.current) return true; // no PIN → no gate
    if (bioEnabledRef.current && bioTypeRef.current) {
      const ok = await authenticateBiometric(r);
      if (ok) return true; // fall through to the PIN pad on failure / cancel
    }
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setReason(r);
      setEntered("");
      setError(false);
      setVisible(true);
    });
  };

  const finish = (ok: boolean) => {
    setVisible(false);
    setEntered("");
    setError(false);
    resolver.current?.(ok);
    resolver.current = null;
  };

  // Auto-check when the PIN is fully entered.
  useEffect(() => {
    if (!visible || entered.length < PIN_LENGTH) return;
    if (entered === pinRef.current) {
      finish(true);
    } else {
      errorHaptic();
      setError(true);
      const t = setTimeout(() => { setEntered(""); setError(false); }, 600);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entered, visible]);

  return (
    <SecurityContext.Provider value={{ pinEnabled: pin !== null, setPin, disablePin, requirePin, biometricType, biometricEnabled, setBiometricEnabled, authenticateBiometric }}>
      {children}

      <Modal visible={visible} transparent animationType="fade" onRequestClose={() => finish(false)} statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: "#fafafa", paddingTop: insets.top }}>
          <LinearGradient pointerEvents="none" colors={["#ffffff", "#ffffff", "#cdeed8"]} locations={[0, 0.45, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <LeafDecor />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 12, paddingTop: 8 }}>
            <Pressable onPress={() => finish(false)} hitSlop={10} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel="ยกเลิก">
              <X size={24} color="#1a1a1a" strokeWidth={2.4} />
            </Pressable>
          </View>

          {/* Icon + title + dots — upper area */}
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 28, paddingTop: 12 }}>
            <View style={{ alignItems: "center", gap: 12 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(49,151,84,0.12)", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={28} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 19, fontWeight: "700", color: "#1a1a1a" }}>{error ? "PIN ไม่ถูกต้อง" : "ใส่รหัส PIN"}</Text>
              <Text style={{ fontSize: 13.5, color: error ? "#dc2626" : "#737373", textAlign: "center", paddingHorizontal: 32 }}>
                {error ? "ลองอีกครั้ง" : reason ?? "กรุณายืนยันรหัส PIN เพื่อดำเนินการต่อ"}
              </Text>
            </View>
            <PinDots value={entered} error={error} />
          </View>
          {/* Keypad — anchored to the bottom */}
          <View style={{ alignItems: "center", paddingBottom: insets.bottom + 24 }}>
            <PinKeypad value={entered} onChange={setEntered} />
          </View>
        </View>
      </Modal>
    </SecurityContext.Provider>
  );
}

export function useSecurity(): SecurityValue {
  const ctx = useContext(SecurityContext);
  if (!ctx) throw new Error("useSecurity must be used within SecurityProvider");
  return ctx;
}
