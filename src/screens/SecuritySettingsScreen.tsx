import { useEffect, useState, type ReactNode } from "react";
import { View, Text, Pressable, ScrollView, Alert, Switch } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Lock, KeyRound, ChevronRight, ScanFace, Fingerprint, ShieldCheck, X, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { PinDots, PinKeypad, errorHaptic } from "../components/PinPad";
import { LeafDecor } from "../components/LeafDecor";
import { useSecurity, biometricLabel } from "../context/SecurityContext";
import { BRAND_GREEN, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
const PIN_LENGTH = 6;

export function SecuritySettingsScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { pinEnabled, setPin, disablePin, requirePin, biometricType, biometricEnabled, setBiometricEnabled, authenticateBiometric } = useSecurity();

  const [mode, setMode] = useState<"idle" | "new" | "confirm">("idle");
  const [first, setFirst] = useState("");
  const [val, setVal] = useState("");
  const [error, setError] = useState(false);

  const startSet = async () => {
    if (pinEnabled) {
      const ok = await requirePin("ยืนยันรหัส PIN เดิมเพื่อเปลี่ยนรหัส");
      if (!ok) return;
    }
    setFirst(""); setVal(""); setError(false); setMode("new");
  };

  const disable = async () => {
    const ok = await requirePin("ยืนยันรหัส PIN เพื่อปิดใช้งาน");
    if (!ok) return;
    disablePin();
    Alert.alert("ปิดใช้งานแล้ว", "ยกเลิกการใช้รหัส PIN เรียบร้อย");
  };

  const togglePin = (next: boolean) => { if (next) startSet(); else disable(); };

  const toggleBiometric = async (next: boolean) => {
    if (next) {
      const ok = await authenticateBiometric(`ยืนยันด้วย ${biometricLabel(biometricType)} เพื่อเปิดใช้งาน`);
      if (ok) setBiometricEnabled(true);
      else Alert.alert("ยืนยันไม่สำเร็จ", `ไม่สามารถเปิดใช้ ${biometricLabel(biometricType)} ได้`);
    } else {
      setBiometricEnabled(false);
    }
  };

  // Drive the two-step set flow as digits are entered.
  useEffect(() => {
    if (mode === "idle" || val.length < PIN_LENGTH) return;
    if (mode === "new") {
      setFirst(val); setVal(""); setMode("confirm");
    } else {
      if (val === first) {
        setPin(val);
        setMode("idle"); setFirst(""); setVal("");
        Alert.alert("ตั้งรหัส PIN สำเร็จ", "ระบบจะขอรหัส PIN เมื่อเข้าหน้าการชำระเงินและตอนยืนยันการชำระด้วยบัตร/ธนาคาร");
      } else {
        errorHaptic();
        setError(true);
        const t = setTimeout(() => { setVal(""); setError(false); setFirst(""); setMode("new"); }, 700);
        return () => clearTimeout(t);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [val, mode]);

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      {mode === "idle" ? (
        <>
        <SubPageHeader
          title="ความปลอดภัย"
          subtitle="รหัส PIN สำหรับการชำระเงิน"
          onBack={() => nav.canGoBack() && nav.goBack()}
          showSearch={false}
        />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24, gap: 18 }}>
          {/* PIN group */}
          <View>
            <Text style={groupLabel}>รหัส PIN</Text>
            <View style={card}>
              <Row Icon={Lock} label="ใช้รหัส PIN" sub={pinEnabled ? "เปิดใช้งานอยู่" : "ปิดอยู่"}>
                <Switch value={pinEnabled} onValueChange={togglePin} trackColor={{ true: BRAND_GREEN, false: "#d4d4d4" }} thumbColor="#fff" ios_backgroundColor="#d4d4d4" />
              </Row>
              {pinEnabled ? (
                <>
                  <Divider />
                  <Pressable onPress={startSet} className="active:opacity-60">
                    <Row Icon={KeyRound} label="เปลี่ยนรหัส PIN">
                      <ChevronRight size={18} color="#c4c4c6" strokeWidth={2.2} />
                    </Row>
                  </Pressable>
                </>
              ) : null}
            </View>
          </View>

          {/* Biometric group — only when a PIN exists and the device supports it */}
          {pinEnabled && biometricType ? (
            <View>
              <Text style={groupLabel}>ไบโอเมตริก</Text>
              <View style={card}>
                <Row Icon={biometricType === "face" ? ScanFace : Fingerprint} label={`ปลดล็อกด้วย ${biometricLabel(biometricType)}`} sub="ใช้แทนการกรอก PIN">
                  <Switch value={biometricEnabled} onValueChange={toggleBiometric} trackColor={{ true: BRAND_GREEN, false: "#d4d4d4" }} thumbColor="#fff" ios_backgroundColor="#d4d4d4" />
                </Row>
              </View>
            </View>
          ) : null}

          <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY, lineHeight: 18, marginHorizontal: 4 }}>
            ใช้ยืนยันตัวตนเมื่อ <Text style={{ fontWeight: "600", color: "#0a0a0a" }}>เข้าหน้าตั้งค่าการชำระเงิน</Text> และเมื่อ <Text style={{ fontWeight: "600", color: "#0a0a0a" }}>ยืนยันการชำระด้วยบัตร/ธนาคาร</Text>
          </Text>
        </ScrollView>
        </>
      ) : (
        <View style={{ flex: 1 }}>
          {/* White at the top fading to soft green at the bottom (matches the app bar tone) */}
          <LinearGradient pointerEvents="none" colors={["#ffffff", "#ffffff", "#cdeed8"]} locations={[0, 0.45, 1]} style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
          <LeafDecor />
          {/* Close (X) top-left — same as the verify modal */}
          <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 12, paddingTop: insets.top + 8 }}>
            <Pressable onPress={() => { setMode("idle"); setVal(""); setFirst(""); setError(false); }} hitSlop={10} style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }} accessibilityLabel="ยกเลิก">
              <X size={24} color="#1a1a1a" strokeWidth={2.4} />
            </Pressable>
          </View>
          {/* Icon + title + dots — upper area */}
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 28, paddingTop: 12 }}>
            <View style={{ alignItems: "center", gap: 12 }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: "rgba(49,151,84,0.12)", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={28} color={BRAND_GREEN} strokeWidth={2.2} />
              </View>
              <Text style={{ fontSize: 19, fontWeight: "700", color: "#1a1a1a" }}>
                {mode === "new" ? "ตั้งรหัส PIN 6 หลัก" : "ยืนยันรหัส PIN อีกครั้ง"}
              </Text>
              <Text style={{ fontSize: 13.5, color: error ? "#dc2626" : "#737373", textAlign: "center", paddingHorizontal: 32 }}>
                {error ? "รหัสไม่ตรงกัน ลองใหม่อีกครั้ง" : mode === "new" ? "ตั้งรหัสที่จำง่ายแต่เดายาก" : "ใส่รหัสเดิมอีกครั้งเพื่อยืนยัน"}
              </Text>
            </View>
            <PinDots value={val} error={error} />
          </View>
          {/* Keypad — anchored to the bottom */}
          <View style={{ alignItems: "center", paddingBottom: insets.bottom + 24 }}>
            <PinKeypad value={val} onChange={setVal} />
          </View>
        </View>
      )}
    </View>
  );
}

const card = { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", overflow: "hidden" } as const;
const groupLabel = { fontSize: 12.5, fontWeight: "700", color: TEXT_MUTED, marginBottom: 6, marginLeft: 4 } as const;

function Row({ Icon, label, sub, children }: { Icon: LucideIcon; label: string; sub?: string; children?: ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 14 }}>
      <View style={{ width: 38, height: 38, borderRadius: 11, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
        <Icon size={19} color={BRAND_GREEN} strokeWidth={2.2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, color: "#0a0a0a", fontWeight: "500" }}>{label}</Text>
        {sub ? <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: "#f0f0f0", marginLeft: 66 }} />;
}
