import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Switch,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  Truck,
  Store,
  MapPin,
  Wallet,
  Settings as SettingsIcon,
  Minus,
  Plus,
  AlertTriangle,
  ChevronRight,
  ShieldCheck,
  Globe,
  Check,
  Pencil,
  X,
} from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { GlassSelect } from "../components/GlassSelect";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";

// ── Carriers (ported from web initialCarriers) ──────────────────────────────
interface Carrier {
  id: string;
  name: string;
  code: string;
  color: string;
  logo?: number;
  baseRate: number;
  perKg: number;
  estimatedDays: string;
  cod: boolean;
  trackingUrl: string;
  enabled: boolean;
}

const INITIAL_CARRIERS: Carrier[] = [
  { id: "thpost", name: "ไปรษณีย์ไทย", code: "TH", color: "#f8201e", logo: require("../../assets/carriers/thaipost.png"), baseRate: 35, perKg: 10, estimatedDays: "2-4 วัน", cod: true, trackingUrl: "track.thailandpost.co.th", enabled: true },
  { id: "kerry", name: "Kerry Express", code: "K", color: "#ff6600", logo: require("../../assets/carriers/kerry.png"), baseRate: 50, perKg: 15, estimatedDays: "1-3 วัน", cod: true, trackingUrl: "th.kerryexpress.com", enabled: true },
  { id: "flash", name: "Flash Express", code: "F", color: "#fdc70d", logo: require("../../assets/carriers/flash.png"), baseRate: 30, perKg: 10, estimatedDays: "1-2 วัน", cod: true, trackingUrl: "flashexpress.com", enabled: false },
  { id: "jt", name: "J&T Express", code: "J&T", color: "#d40511", logo: require("../../assets/carriers/jt.png"), baseRate: 40, perKg: 12, estimatedDays: "1-3 วัน", cod: true, trackingUrl: "jtexpress.co.th", enabled: false },
  { id: "dhl", name: "DHL Express", code: "DHL", color: "#ffcc00", baseRate: 120, perKg: 50, estimatedDays: "1 วัน", cod: false, trackingUrl: "dhl.com/th-th", enabled: false },
];

// Carriers whose brand color is light → use dark code/name text for contrast.
const LIGHT_BRAND = new Set(["flash", "dhl"]);

// Pickup operating-hours pickers (GlassSelect popover ไม่ scroll → ลิสต์สั้น)
const DAY_OPTIONS = ["จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์", "อาทิตย์"].map((d) => ({ key: d, label: d }));
const OPEN_TIME_OPTIONS = ["06:00", "07:00", "08:00", "08:30", "09:00", "09:30", "10:00", "11:00"].map((t) => ({ key: t, label: t }));
const CLOSE_TIME_OPTIONS = ["16:00", "17:00", "17:30", "18:00", "18:30", "19:00", "20:00", "21:00", "22:00"].map((t) => ({ key: t, label: t }));

// Pill text input — matches the app-wide field look.
const inputStyle = {
  minHeight: 50,
  backgroundColor: "#f5f5f5",
  borderRadius: 999,
  paddingHorizontal: 18,
  paddingVertical: 12,
  fontSize: 15,
  color: "#374151",
} as const;

// Disabled pill — greyed text/fill when the block's master toggle is OFF.
const inputDisabledStyle = {
  ...inputStyle,
  backgroundColor: "#fafafa",
  color: "#a3a3a3",
} as const;

const labelStyle = { fontSize: 12.5, color: TEXT_MUTED } as const;
const hintStyle = { fontSize: 10.5, color: "#9ca3af", paddingLeft: 6 } as const;

/** White card section on the #fafafa page. */
function Card({ children }: { children: React.ReactNode }) {
  return (
    <View className="bg-white" style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>{children}</View>
  );
}

/** Labeled field wrapper. */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={labelStyle}>{label}</Text>
      {children}
      {hint ? <Text style={hintStyle}>{hint}</Text> : null}
    </View>
  );
}

/**
 * Number stepper — a pill row with a − button (left), the centered tabular
 * number, and a ＋ button (right). Mirrors the web StepperInput (step 50,
 * clamped at ≥0).
 */
function StepperInput({
  value,
  onChange,
  step = 50,
}: {
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  const dec = () => onChange(Math.max(0, value - step));
  const inc = () => onChange(value + step);
  const set = (t: string) => {
    const n = Number(t.replace(/[^0-9]/g, ""));
    onChange(Number.isNaN(n) ? 0 : Math.max(0, n));
  };
  return (
    <View
      className="flex-row items-center"
      style={{ height: 50, backgroundColor: "#f5f5f5", borderRadius: 999, paddingLeft: 18, paddingRight: 5, gap: 10 }}
    >
      {/* Number input — fills the left (web layout) */}
      <TextInput
        value={String(value)}
        onChangeText={set}
        keyboardType="number-pad"
        style={{ flex: 1, fontSize: 15, fontWeight: "600", color: "#374151", fontVariant: ["tabular-nums"], paddingVertical: 0 }}
      />
      {/* Segmented −/＋ control on the right, with a center separator */}
      <View
        className="flex-row items-center"
        style={{ width: 96, height: 36, borderRadius: 999, overflow: "hidden", backgroundColor: "rgba(116,116,128,0.10)" }}
      >
        <Pressable onPress={dec} className="active:opacity-60" style={{ flex: 1, height: "100%", alignItems: "center", justifyContent: "center" }}>
          <Minus size={18} color="#1a1a1a" strokeWidth={2.6} />
        </Pressable>
        <View style={{ width: 1, height: 20, backgroundColor: "rgba(60,60,67,0.3)" }} />
        <Pressable onPress={inc} className="active:opacity-60" style={{ flex: 1, height: "100%", alignItems: "center", justifyContent: "center" }}>
          <Plus size={18} color="#1a1a1a" strokeWidth={2.6} />
        </Pressable>
      </View>
    </View>
  );
}

/** Title row for a card (icon + title, optional right slot). */
function CardTitle({
  icon,
  title,
  right,
}: {
  icon: React.ReactNode;
  title: string;
  right?: React.ReactNode;
}) {
  return (
    <View
      className="flex-row items-center justify-between"
      style={{ gap: 8 }}
    >
      <View className="flex-row items-center" style={{ gap: 8, flex: 1 }}>
        {icon}
        <Text style={{ fontSize: 15, color: "#000", fontWeight: "700" }}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

function EditIconButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityLabel="แก้ไข" className="items-center justify-center active:opacity-60" style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#f3f3f3" }}>
      <Pencil size={16} color={TEXT_SECONDARY} strokeWidth={2.2} />
    </Pressable>
  );
}

function SheetHeader({ title, onClose, onSave }: { title: string; onClose: () => void; onSave: () => void }) {
  return (
    <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 }}>
      <GlassIconButton onPress={onClose} size={44} accessibilityLabel="ปิด">
        <X size={22} color="#1a1a1a" strokeWidth={2.6} />
      </GlassIconButton>
      <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>{title}</Text>
      <GlassIconButton onPress={onSave} size={44} accessibilityLabel="บันทึก" tintColor="rgba(49,151,84,0.22)">
        <Check size={22} color={BRAND_GREEN_DARK} strokeWidth={3} />
      </GlassIconButton>
    </View>
  );
}

// Read-only label + value row for the preview sections.
function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between" style={{ gap: 12 }}>
      <Text style={{ fontSize: 13.5, color: TEXT_MUTED }}>{label}</Text>
      <Text style={{ fontSize: 14.5, fontWeight: "700", color: "#0a0a0a" }}>{value}</Text>
    </View>
  );
}

// Toggle row used inside the carrier edit sheet (label/icon + Switch on a light pill).
function ToggleRow({ label, icon, value, onValueChange }: { label: string; icon?: React.ReactNode; value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between" style={{ backgroundColor: "#f7f7f7", borderRadius: 16, paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
      <View className="flex-row items-center" style={{ gap: 8, flex: 1 }}>
        {icon}
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#374151" }}>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: "#d1d5db", true: BRAND_GREEN }} thumbColor="#fff" />
    </View>
  );
}

// Tappable menu row for an option (pickup / remote / COD) → opens its edit sheet.
function SettingRow({ icon, iconBg, title, badge, badgeBg, badgeColor, summary, enabled, onPress }: {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  badge?: string;
  badgeBg?: string;
  badgeColor?: string;
  summary: string;
  enabled: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} className="flex-row items-center active:opacity-60" style={{ gap: 12 }}>
      <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: iconBg, alignItems: "center", justifyContent: "center" }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <View className="flex-row items-center" style={{ gap: 6 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{title}</Text>
          {badge ? (
            <View style={{ backgroundColor: badgeBg, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
              <Text style={{ color: badgeColor, fontSize: 10, fontWeight: "700" }}>{badge}</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 12, color: "#8a8f8a", marginTop: 2 }} numberOfLines={1}>{summary}</Text>
      </View>
      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: enabled ? BRAND_GREEN : "#d1d5db" }} />
      <ChevronRight size={18} color="#c4c4c4" strokeWidth={2.4} />
    </Pressable>
  );
}

/** Owner console: default shipping, carriers, pickup, remote areas, and COD. */
export function ShopShippingScreen() {
  const insets = useSafeAreaInsets();
  const nav = useNavigation();

  // 1. ค่าจัดส่งเริ่มต้น
  const [freeShippingMin, setFreeShippingMin] = useState(500);
  const [baseShippingCost, setBaseShippingCost] = useState(35);
  const [defaultWeight, setDefaultWeight] = useState(500);
  // Default-shipping is read-only by default; edited via a page-sheet (drafts revert on cancel).
  const [defaultsSheet, setDefaultsSheet] = useState(false);
  const [dFree, setDFree] = useState(freeShippingMin);
  const [dBase, setDBase] = useState(baseShippingCost);
  const [dWeight, setDWeight] = useState(defaultWeight);
  const openDefaults = () => { setDFree(freeShippingMin); setDBase(baseShippingCost); setDWeight(defaultWeight); setDefaultsSheet(true); };
  const saveDefaults = () => { setFreeShippingMin(dFree); setBaseShippingCost(dBase); setDefaultWeight(dWeight); setDefaultsSheet(false); };

  // 2. ขนส่งที่ร้านใช้บริการ — รายการเมนู, แตะแต่ละขนส่งเพื่อตั้งค่าผ่านชีต
  const [carriers, setCarriers] = useState<Carrier[]>(INITIAL_CARRIERS);
  const enabledCount = carriers.filter((c) => c.enabled).length;
  const [carrierSheet, setCarrierSheet] = useState<string | null>(null);
  const [cDraft, setCDraft] = useState<Carrier | null>(null);
  const openCarrier = (c: Carrier) => { setCDraft({ ...c }); setCarrierSheet(c.id); };
  const closeCarrier = () => { setCarrierSheet(null); setCDraft(null); };
  const saveCarrier = () => {
    if (cDraft && carrierSheet) setCarriers((prev) => prev.map((c) => (c.id === carrierSheet ? { ...cDraft } : c)));
    closeCarrier();
  };

  // 3. รับที่ร้าน (Pickup)
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [pickupOpenDay, setPickupOpenDay] = useState("จันทร์");
  const [pickupCloseDay, setPickupCloseDay] = useState("ศุกร์");
  const [pickupOpenTime, setPickupOpenTime] = useState("09:00");
  const [pickupCloseTime, setPickupCloseTime] = useState("18:00");
  const [pickupAddress, setPickupAddress] = useState(
    "459/153 ถ.สุขสวัสดิ์ แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ กรุงเทพฯ 10140",
  );
  const [pickupNote, setPickupNote] = useState("กรุณาแจ้งเลขออเดอร์ที่หน้าร้านเพื่อรับสินค้า");

  // 4. พื้นที่ห่างไกล
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [remoteFee, setRemoteFee] = useState("150");
  const [remoteAreas, setRemoteAreas] = useState(
    "เกาะสมุย, เกาะพะงัน, เกาะเต่า, เกาะช้าง, เกาะลันตา, แม่ฮ่องสอน (อ.ปาย, อ.ปางมะผ้า)",
  );

  // 5. เก็บเงินปลายทาง (COD)
  const [codEnabled, setCodEnabled] = useState(true);
  const [codFee, setCodFee] = useState(20);

  // Edit sheets for pickup / remote / COD — drafts (null = closed, cancel reverts)
  const [pickupDraft, setPickupDraft] = useState<{ enabled: boolean; openDay: string; closeDay: string; openTime: string; closeTime: string; address: string; note: string } | null>(null);
  const openPickup = () => setPickupDraft({ enabled: pickupEnabled, openDay: pickupOpenDay, closeDay: pickupCloseDay, openTime: pickupOpenTime, closeTime: pickupCloseTime, address: pickupAddress, note: pickupNote });
  const savePickup = () => {
    if (pickupDraft) {
      setPickupEnabled(pickupDraft.enabled);
      setPickupOpenDay(pickupDraft.openDay); setPickupCloseDay(pickupDraft.closeDay);
      setPickupOpenTime(pickupDraft.openTime); setPickupCloseTime(pickupDraft.closeTime);
      setPickupAddress(pickupDraft.address); setPickupNote(pickupDraft.note);
    }
    setPickupDraft(null);
  };

  const [remoteDraft, setRemoteDraft] = useState<{ enabled: boolean; fee: string; areas: string } | null>(null);
  const openRemote = () => setRemoteDraft({ enabled: remoteEnabled, fee: remoteFee, areas: remoteAreas });
  const saveRemote = () => {
    if (remoteDraft) { setRemoteEnabled(remoteDraft.enabled); setRemoteFee(remoteDraft.fee); setRemoteAreas(remoteDraft.areas); }
    setRemoteDraft(null);
  };

  const [codDraft, setCodDraft] = useState<{ enabled: boolean; fee: number } | null>(null);
  const openCod = () => setCodDraft({ enabled: codEnabled, fee: codFee });
  const saveCod = () => {
    if (codDraft) { setCodEnabled(codDraft.enabled); setCodFee(codDraft.fee); }
    setCodDraft(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader
        title="การจัดส่ง"
        subtitle="ตั้งค่าขนส่งและการรับสินค้า"
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── 1. ค่าจัดส่งเริ่มต้น (พรีวิว · แก้ไขผ่านชีต) ── */}
          <Card>
            <CardTitle
              icon={<SettingsIcon size={18} color={BRAND_GREEN} strokeWidth={2.2} />}
              title="ค่าจัดส่งเริ่มต้น"
              right={<EditIconButton onPress={openDefaults} />}
            />
            <View style={{ gap: 14 }}>
              <ViewRow label="ส่งฟรีเมื่อซื้อครบ" value={freeShippingMin > 0 ? `฿${freeShippingMin}` : "ปิดใช้งาน"} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
              <ViewRow label="ค่าจัดส่งเริ่มต้น" value={`฿${baseShippingCost}`} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
              <ViewRow label="น้ำหนักเริ่มต้น" value={`${defaultWeight} กรัม`} />
            </View>
          </Card>

          {/* ── 2. ขนส่งที่ร้านใช้บริการ (รายการเมนู → แตะตั้งค่าแต่ละขนส่ง) ── */}
          <Card>
            <CardTitle
              icon={<Truck size={18} color={BRAND_GREEN} strokeWidth={2.2} />}
              title="ขนส่งที่ร้านใช้บริการ"
              right={
                <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                  <Text style={{ color: BRAND_GREEN, fontWeight: "600" }}>{enabledCount}</Text>
                  {` / ${carriers.length} เปิดใช้งาน`}
                </Text>
              }
            />
            <View>
              {carriers.map((c, i) => {
                const codeColor = LIGHT_BRAND.has(c.id) ? "#a16207" : c.color;
                return (
                  <View key={c.id}>
                    {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0" }} /> : null}
                    <Pressable
                      onPress={() => openCarrier(c)}
                      className="flex-row items-center active:opacity-60"
                      style={{ gap: 12, paddingVertical: 12, opacity: c.enabled ? 1 : 0.6 }}
                    >
                      <View style={{ width: 52, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: `${c.color}14`, overflow: "hidden" }}>
                        {c.logo ? (
                          <Image source={c.logo} style={{ width: 46, height: 32 }} resizeMode="contain" />
                        ) : (
                          <Text style={{ fontSize: c.code.length > 2 ? 11 : 14, fontWeight: "800", color: codeColor }}>{c.code}</Text>
                        )}
                      </View>
                      <View style={{ flex: 1 }}>
                        <View className="flex-row items-center" style={{ gap: 6 }}>
                          <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a" }}>{c.name}</Text>
                          {c.cod ? (
                            <View className="flex-row items-center" style={{ gap: 2, backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <ShieldCheck size={10} color={BRAND_GREEN} strokeWidth={2.6} />
                              <Text style={{ fontSize: 9.5, fontWeight: "700", color: BRAND_GREEN }}>COD</Text>
                            </View>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 12, color: "#8a8f8a", marginTop: 1 }}>
                          {c.enabled ? `฿${c.baseRate} +฿${c.perKg}/กก. · ${c.estimatedDays}` : "ปิดใช้งาน"}
                        </Text>
                      </View>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: c.enabled ? BRAND_GREEN : "#d1d5db" }} />
                      <ChevronRight size={18} color="#c4c4c4" strokeWidth={2.4} />
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </Card>

          {/* ── 3. รับที่ร้าน (เมนู → ชีต) ── */}
          <Card>
            <SettingRow
              icon={<Store size={20} color={BRAND_GREEN} strokeWidth={2.2} />}
              iconBg="rgba(49,151,84,0.1)"
              title="รับที่ร้าน"
              badge="ฟรี"
              badgeBg={BRAND_GREEN}
              badgeColor="#fff"
              summary={pickupEnabled ? `${pickupOpenDay}–${pickupCloseDay} ${pickupOpenTime}–${pickupCloseTime} น.` : "ปิดใช้งาน"}
              enabled={pickupEnabled}
              onPress={openPickup}
            />
          </Card>

          {/* ── 4. พื้นที่ห่างไกล (เมนู → ชีต) ── */}
          <Card>
            <SettingRow
              icon={<MapPin size={20} color="#0088ff" strokeWidth={2.2} />}
              iconBg="rgba(0,136,255,0.1)"
              title="พื้นที่ห่างไกล"
              badge="ราคาเหมา"
              badgeBg="rgba(0,136,255,0.1)"
              badgeColor="#0088ff"
              summary={remoteEnabled ? `฿${remoteFee} เหมาจ่าย` : "ปิดใช้งาน"}
              enabled={remoteEnabled}
              onPress={openRemote}
            />
          </Card>

          {/* ── 5. เก็บเงินปลายทาง (เมนู → ชีต) ── */}
          <Card>
            <SettingRow
              icon={<Wallet size={20} color="#ff9500" strokeWidth={2.2} />}
              iconBg="rgba(255,149,0,0.1)"
              title="เก็บเงินปลายทาง (COD)"
              summary={codEnabled ? `ค่าธรรมเนียม ฿${codFee}` : "ปิดใช้งาน"}
              enabled={codEnabled}
              onPress={openCod}
            />
          </Card>

        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </KeyboardAvoidingView>

      {/* Edit ค่าจัดส่งเริ่มต้น — page-sheet (same pattern as the other settings) */}
      <Modal visible={defaultsSheet} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setDefaultsSheet(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="แก้ไขค่าจัดส่งเริ่มต้น" onClose={() => setDefaultsSheet(false)} onSave={saveDefaults} />
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
            <Field label="ส่งฟรีเมื่อซื้อครบ (฿)" hint="0 = ปิดใช้งานส่งฟรี">
              <StepperInput value={dFree} onChange={setDFree} />
            </Field>
            <Field label="ค่าจัดส่งเริ่มต้น (฿)" hint="ใช้เมื่อยังไม่ได้ตั้งค่าขนส่งรายเจ้า">
              <StepperInput value={dBase} onChange={setDBase} step={5} />
            </Field>
            <Field label="น้ำหนักเริ่มต้น (กรัม)" hint="ใช้กับสินค้าที่ยังไม่ได้กรอกน้ำหนัก">
              <StepperInput value={dWeight} onChange={setDWeight} step={50} />
            </Field>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit ขนส่งรายเจ้า — page-sheet (toggle เปิด/COD + ค่าส่ง + เวลา + URL) */}
      <Modal visible={carrierSheet !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={closeCarrier}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="ตั้งค่าขนส่ง" onClose={closeCarrier} onSave={saveCarrier} />
          {cDraft ? (
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
              {/* Brand identity banner */}
              <View style={{ borderRadius: 16, overflow: "hidden", backgroundColor: cDraft.enabled ? cDraft.color : "#9ca3af" }}>
                <View className="flex-row items-center" style={{ padding: 14, gap: 12 }}>
                  <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontSize: cDraft.code.length > 2 ? 13 : 15, fontWeight: "800", color: cDraft.color }}>{cDraft.code}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 17, fontWeight: "700", color: LIGHT_BRAND.has(cDraft.id) ? "#1a1a1a" : "#fff" }}>{cDraft.name}</Text>
                    <View className="flex-row items-center" style={{ gap: 5, marginTop: 3 }}>
                      <Globe size={12} color={LIGHT_BRAND.has(cDraft.id) ? "#1a1a1a" : "#fff"} strokeWidth={2.2} style={{ opacity: 0.85 }} />
                      <Text numberOfLines={1} style={{ flex: 1, fontSize: 12, color: LIGHT_BRAND.has(cDraft.id) ? "#1a1a1a" : "#fff", opacity: 0.85 }}>
                        {cDraft.trackingUrl || "ยังไม่ได้กรอก URL ติดตาม"}
                      </Text>
                    </View>
                  </View>
                  {cDraft.logo ? (
                    <Image source={cDraft.logo} style={{ width: 96, height: 60 }} resizeMode="contain" />
                  ) : null}
                </View>
              </View>

              {/* Toggles */}
              <ToggleRow label="เปิดใช้งานขนส่งนี้" value={cDraft.enabled} onValueChange={(v) => setCDraft({ ...cDraft, enabled: v })} />
              <ToggleRow label="รองรับเก็บเงินปลายทาง (COD)" icon={<ShieldCheck size={16} color={BRAND_GREEN} strokeWidth={2.4} />} value={cDraft.cod} onValueChange={(v) => setCDraft({ ...cDraft, cod: v })} />

              {/* Rates */}
              <View className="flex-row" style={{ gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Field label="ค่าส่งเริ่มต้น (฿)">
                    <TextInput value={String(cDraft.baseRate)} onChangeText={(t) => setCDraft({ ...cDraft, baseRate: Number(t.replace(/[^0-9]/g, "")) || 0 })} keyboardType="number-pad" style={inputStyle} />
                  </Field>
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="ต่อ กก. (฿)">
                    <TextInput value={String(cDraft.perKg)} onChangeText={(t) => setCDraft({ ...cDraft, perKg: Number(t.replace(/[^0-9]/g, "")) || 0 })} keyboardType="number-pad" style={inputStyle} />
                  </Field>
                </View>
              </View>
              <Field label="เวลาจัดส่งโดยประมาณ">
                <TextInput value={cDraft.estimatedDays} onChangeText={(t) => setCDraft({ ...cDraft, estimatedDays: t })} placeholder="เช่น 1-3 วัน" placeholderTextColor="#bdbdbd" style={inputStyle} />
              </Field>
              <Field label="URL ติดตามพัสดุ">
                <TextInput value={cDraft.trackingUrl} onChangeText={(t) => setCDraft({ ...cDraft, trackingUrl: t })} placeholder="track.example.com" placeholderTextColor="#bdbdbd" autoCapitalize="none" style={inputStyle} />
              </Field>
            </ScrollView>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit รับที่ร้าน — page-sheet */}
      <Modal visible={pickupDraft !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setPickupDraft(null)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="รับที่ร้าน" onClose={() => setPickupDraft(null)} onSave={savePickup} />
          {pickupDraft ? (
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
              <ToggleRow label="เปิดใช้งานรับที่ร้าน" icon={<Store size={16} color={BRAND_GREEN} strokeWidth={2.4} />} value={pickupDraft.enabled} onValueChange={(v) => setPickupDraft({ ...pickupDraft, enabled: v })} />
              <Field label="วันทำการ">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <GlassSelect value={pickupDraft.openDay} options={DAY_OPTIONS} onSelect={(k) => setPickupDraft({ ...pickupDraft, openDay: k })} />
                  </View>
                  <Text style={{ fontSize: 13, color: TEXT_MUTED }}>ถึง</Text>
                  <View style={{ flex: 1 }}>
                    <GlassSelect value={pickupDraft.closeDay} options={DAY_OPTIONS} onSelect={(k) => setPickupDraft({ ...pickupDraft, closeDay: k })} />
                  </View>
                </View>
              </Field>
              <Field label="เวลาทำการ">
                <View className="flex-row items-center" style={{ gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <GlassSelect value={pickupDraft.openTime} options={OPEN_TIME_OPTIONS} onSelect={(k) => setPickupDraft({ ...pickupDraft, openTime: k })} />
                  </View>
                  <Text style={{ fontSize: 13, color: TEXT_MUTED }}>ถึง</Text>
                  <View style={{ flex: 1 }}>
                    <GlassSelect value={pickupDraft.closeTime} options={CLOSE_TIME_OPTIONS} onSelect={(k) => setPickupDraft({ ...pickupDraft, closeTime: k })} />
                  </View>
                </View>
              </Field>
              <Field label="ที่อยู่รับสินค้า">
                <TextInput value={pickupDraft.address} onChangeText={(t) => setPickupDraft({ ...pickupDraft, address: t })} placeholder="ที่อยู่หน้าร้านสำหรับให้ลูกค้ามารับสินค้า" placeholderTextColor="#a3a3a3" multiline style={[inputStyle, { borderRadius: 18, minHeight: 72, textAlignVertical: "top" }]} />
              </Field>
              <Field label="หมายเหตุถึงลูกค้า">
                <TextInput value={pickupDraft.note} onChangeText={(t) => setPickupDraft({ ...pickupDraft, note: t })} placeholder="ข้อความที่จะแสดงให้ลูกค้าเห็น" placeholderTextColor="#a3a3a3" style={inputStyle} />
              </Field>
            </ScrollView>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit พื้นที่ห่างไกล — page-sheet */}
      <Modal visible={remoteDraft !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setRemoteDraft(null)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="พื้นที่ห่างไกล" onClose={() => setRemoteDraft(null)} onSave={saveRemote} />
          {remoteDraft ? (
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
              <ToggleRow label="เปิดใช้งานพื้นที่ห่างไกล" icon={<MapPin size={16} color="#0088ff" strokeWidth={2.4} />} value={remoteDraft.enabled} onValueChange={(v) => setRemoteDraft({ ...remoteDraft, enabled: v })} />
              <Field label="ค่าจัดส่งเหมาจ่าย (฿)">
                <TextInput value={remoteDraft.fee} onChangeText={(t) => setRemoteDraft({ ...remoteDraft, fee: t.replace(/[^0-9]/g, "") })} placeholder="150" placeholderTextColor="#a3a3a3" keyboardType="number-pad" style={inputStyle} />
              </Field>
              <Field label="รายการพื้นที่ห่างไกล" hint="คั่นด้วยจุลภาค (,) ระบบจะ override ค่าส่งเป็นราคาเหมาเมื่อพบคำที่ตรงกัน">
                <TextInput value={remoteDraft.areas} onChangeText={(t) => setRemoteDraft({ ...remoteDraft, areas: t })} placeholder="ระบุชื่ออำเภอ / เกาะ / จังหวัด คั่นด้วยจุลภาค เช่น เกาะสมุย, เกาะพะงัน" placeholderTextColor="#a3a3a3" multiline style={[inputStyle, { borderRadius: 18, minHeight: 80, textAlignVertical: "top" }]} />
              </Field>
            </ScrollView>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit เก็บเงินปลายทาง (COD) — page-sheet */}
      <Modal visible={codDraft !== null} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setCodDraft(null)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="เก็บเงินปลายทาง (COD)" onClose={() => setCodDraft(null)} onSave={saveCod} />
          {codDraft ? (
            <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
              <ToggleRow label="เปิดใช้งาน COD" icon={<Wallet size={16} color="#ff9500" strokeWidth={2.4} />} value={codDraft.enabled} onValueChange={(v) => setCodDraft({ ...codDraft, enabled: v })} />
              <Field label="ค่าธรรมเนียม COD (฿)" hint="คิดเพิ่มจากยอดสินค้าเมื่อลูกค้าเลือก COD">
                <StepperInput value={codDraft.fee} onChange={(v) => setCodDraft({ ...codDraft, fee: v })} step={5} />
              </Field>
              <View className="flex-row items-start" style={{ gap: 10, backgroundColor: "rgba(255,149,0,0.05)", borderWidth: 1, borderColor: "rgba(255,149,0,0.2)", borderRadius: 14, padding: 12 }}>
                <AlertTriangle size={16} color="#ff9500" strokeWidth={2.2} style={{ marginTop: 1 }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, color: "#9a3412", fontWeight: "600" }}>เคล็ดลับ</Text>
                  <Text style={{ fontSize: 11, color: TEXT_SECONDARY, lineHeight: 17, marginTop: 2 }}>
                    ออเดอร์ COD มีโอกาสถูกปฏิเสธรับสินค้าสูงกว่า แนะนำให้เก็บค่าธรรมเนียมเพื่อชดเชยความเสี่ยง
                  </Text>
                </View>
              </View>
            </ScrollView>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
