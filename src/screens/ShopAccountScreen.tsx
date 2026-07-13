import { glassTint } from "../theme/tokens";
import { useState, type ReactNode } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Beaker, Camera, Check, ChevronRight, FileText, FlaskConical, Pencil, ShieldCheck, Store, X, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { GlassIconButton } from "../components/GlassIconButton";
import { getImagePicker } from "../utils/imagePicker";
import { modalTopPad } from "../theme/layout";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";
import { useSeller } from "../context/SellerContext";
import { SHOP } from "./ShopScreen";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// Mirror AccountInfoScreen ("บัญชีของฉัน") exactly: read-only display by default;
// the pencil opens a native page-sheet to edit; ✓ saves.
const INPUT = { minHeight: 50, backgroundColor: "#f5f5f5", borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12, fontSize: 15, color: "#374151" } as const;

function FieldLabel({ children }: { children: string }) {
  return <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>{children}</Text>;
}

function Section({ title, right, children }: { title?: string; right?: ReactNode; children: ReactNode }) {
  return (
    <View className="bg-white" style={{ marginTop: 8, paddingHorizontal: 16, paddingVertical: 16 }}>
      {title ? (
        <View className="flex-row items-center justify-between" style={{ marginBottom: 12 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a" }}>{title}</Text>
          {right}
        </View>
      ) : null}
      {children}
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

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 3 }}>
      <FieldLabel>{label}</FieldLabel>
      <Text style={{ fontSize: 14.5, fontWeight: "500", color: "#0a0a0a", lineHeight: 21 }}>{value}</Text>
    </View>
  );
}

function SheetHeader({ title, onClose, onSave, canSave }: { title: string; onClose: () => void; onSave: () => void; canSave: boolean }) {
  const insets = useSafeAreaInsets();
  return (
    // Android: clear the status bar (iOS modal card already starts below it)
    <View className="flex-row items-center justify-between" style={{ paddingHorizontal: 16, paddingTop: 16 + modalTopPad(insets.top), paddingBottom: 12 }}>
      <GlassIconButton onPress={onClose} size={44} accessibilityLabel="ปิด">
        <X size={22} color="#1a1a1a" strokeWidth={2.6} />
      </GlassIconButton>
      <Text style={{ fontSize: 18, fontWeight: "700", color: "#1a1a1a" }}>{title}</Text>
      <GlassIconButton onPress={onSave} disabled={!canSave} size={44} accessibilityLabel="บันทึก" tintColor={glassTint("rgba(49,151,84,0.22)", "#d2e8d9")}>
        <Check size={22} color={BRAND_GREEN_DARK} strokeWidth={3} />
      </GlassIconButton>
    </View>
  );
}

// Documents & certifications submitted at registration (legal docs + standard
// certs from the supplier/seller apply forms). Read-only here.
const SHOP_DOCS: { name: string; sub: string }[] = [
  { name: "หนังสือรับรองบริษัท / ทะเบียนพาณิชย์", sub: "ยื่นตอนสมัครร้านค้า" },
  { name: "เอกสารยืนยันตัวตน (บัตรประชาชน)", sub: "ยื่นตอนสมัครร้านค้า" },
  { name: "ใบอนุญาต อย. (FDA)", sub: "เลขที่ อย. 10-1-12345 · หมดอายุ 31 ธ.ค. 2570" },
  { name: "GMP — มาตรฐานการผลิตที่ดี", sub: "เลขที่ GMP-2566-0042 · หมดอายุ 15 มิ.ย. 2569" },
  { name: "HACCP", sub: "เลขที่ HACCP-TH-8891 · หมดอายุ 20 ส.ค. 2569" },
  { name: "ISO 22000:2018", sub: "เลขที่ ISO-22000-44120 · หมดอายุ 10 พ.ย. 2570" },
];

function DocRow({ name, sub }: { name: string; sub: string }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
        <FileText size={18} color={BRAND_GREEN} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>{name}</Text>
        <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>{sub}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
        <ShieldCheck size={11} color={BRAND_GREEN} strokeWidth={2.4} />
        <Text style={{ fontSize: 10.5, fontWeight: "600", color: BRAND_GREEN }}>ยืนยันแล้ว</Text>
      </View>
    </View>
  );
}

// One registration the shop has (or hasn't) applied for. Tappable → read-only
// detail when applied.
function RegRow({ Icon, label, sub, active, onPress }: { Icon: LucideIcon; label: string; sub: string; active: boolean; onPress?: () => void }) {
  const inner = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: active ? "rgba(49,151,84,0.1)" : "#f3f3f3", alignItems: "center", justifyContent: "center" }}>
        <Icon size={18} color={active ? BRAND_GREEN : "#9ca3af"} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>{label}</Text>
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>{sub}</Text>
      </View>
      {!active ? (
        <View style={{ backgroundColor: "#f3f3f3", borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 }}>
          <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#9ca3af" }}>ยังไม่สมัคร</Text>
        </View>
      ) : null}
      {active && onPress ? <ChevronRight size={18} color="#c4c4c4" strokeWidth={2.2} /> : null}
    </View>
  );
  return active && onPress ? (
    <Pressable onPress={onPress} className="active:opacity-60">{inner}</Pressable>
  ) : inner;
}

export function ShopAccountScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { shopLogoUri, setShopLogoUri, shopProfile, setShopProfile, isSeller, isSupplier, isTrialBrand } = useSeller();

  // Committed values (what the view shows) — seeded from SellerContext / SHOP defaults.
  const [logo, setLogo] = useState<string | null>(shopLogoUri);
  const [name, setName] = useState(shopProfile?.shopName ?? SHOP.name);
  const [description, setDescription] = useState(shopProfile?.description ?? SHOP.description);
  const [email, setEmail] = useState(shopProfile?.email ?? "");
  const [phone, setPhone] = useState(shopProfile?.phone ?? "");

  // Edit sheet + drafts (so Cancel/close reverts cleanly).
  const [sheet, setSheet] = useState(false);
  const [dLogo, setDLogo] = useState<string | null>(logo);
  const [dName, setDName] = useState(name);
  const [dDesc, setDDesc] = useState(description);
  const [dEmail, setDEmail] = useState(email);
  const [dPhone, setDPhone] = useState(phone);

  const openEdit = () => {
    setDLogo(logo);
    setDName(name);
    setDDesc(description);
    setDEmail(email);
    setDPhone(phone);
    setSheet(true);
  };

  const pickLogo = async () => {
    const P = getImagePicker();
    if (!P) { Alert.alert("ยังเปลี่ยนรูปไม่ได้", "ตัวรันนี้ยังไม่มีโมดูลคลังรูป — ต้อง build แอปใหม่จึงจะเปลี่ยนรูปได้"); return; }
    const res = await P.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.7 });
    if (!res.canceled && res.assets?.[0]) setDLogo(res.assets[0].uri);
  };

  const canSave = dName.trim().length > 0;

  const saveProfile = () => {
    const nextName = dName.trim() || SHOP.name;
    setLogo(dLogo);
    setName(nextName);
    setDescription(dDesc.trim());
    setEmail(dEmail.trim());
    setPhone(dPhone.trim());
    setShopLogoUri(dLogo);
    setShopProfile({
      shopName: nextName,
      ownerName: shopProfile?.ownerName ?? "",
      taxId: shopProfile?.taxId ?? "",
      address: shopProfile?.address ?? "",
      email: dEmail.trim(),
      phone: dPhone.trim(),
      description: dDesc.trim(),
    });
    setSheet(false);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title="บัญชีร้านค้า" subtitle="ข้อมูลร้านค้าของคุณ" onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          {/* Shop hero — display only */}
          <Section>
            <View style={{ alignItems: "center", gap: 12 }}>
              <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(49,151,84,0.1)", borderWidth: 2, borderColor: "rgba(49,151,84,0.3)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <Image source={logo ? { uri: logo } : SHOP.logo} style={{ width: "100%", height: "100%" }} resizeMode="cover"
          resizeMethod="resize" />
              </View>
              <View style={{ alignItems: "center", gap: 6 }}>
                <Text numberOfLines={1} style={{ fontSize: 18, fontWeight: "700", color: "#0a0a0a" }}>{name}</Text>
                <View className="flex-row items-center" style={{ backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, gap: 5 }}>
                  <ShieldCheck size={13} color={BRAND_GREEN} strokeWidth={2.2} />
                  <Text style={{ fontSize: 12.5, fontWeight: "600", color: BRAND_GREEN }}>ยืนยันแล้ว</Text>
                </View>
              </View>
            </View>
          </Section>

          {/* Shop info — display only; the pencil opens the edit sheet */}
          <Section title="ข้อมูลร้านค้า" right={<EditIconButton onPress={openEdit} />}>
            <View style={{ gap: 14 }}>
              <ViewRow label="ชื่อร้านค้า" value={name} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
              <ViewRow label="คำอธิบายร้าน" value={description || "—"} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
              <ViewRow label="อีเมล" value={email || "—"} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0" }} />
              <ViewRow label="เบอร์โทร" value={phone || "—"} />
            </View>
          </Section>

          {/* Registrations the shop applied for — tap an active one to view its
              read-only application details. */}
          <Section title="การสมัครของร้าน">
            <View>
              <RegRow Icon={Store} label="ร้านค้า" sub="ขายสินค้าทั่วไป" active={isSeller} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />
              <RegRow Icon={Beaker} label="ผู้จำหน่ายวัตถุดิบ (Supplier)" sub="Herbal Market B2B" active={isSupplier} onPress={() => nav.navigate("SupplierInfo")} />
              <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />
              <RegRow Icon={FlaskConical} label="แบรนด์ทดสอบ" sub="ลงสินค้าให้ผู้ใช้ทดลอง" active={isTrialBrand} onPress={() => nav.navigate("BrandInfo")} />
            </View>
          </Section>

          {/* Documents & certifications submitted at registration — read-only */}
          <Section title="เอกสารและใบรับรอง">
            <View>
              {SHOP_DOCS.map((d, i) => (
                <View key={d.name}>
                  {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} /> : null}
                  <DocRow name={d.name} sub={d.sub} />
                </View>
              ))}
            </View>
            <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 14, lineHeight: 17 }}>
              เอกสารที่ยื่นตอนสมัครและผ่านการตรวจสอบแล้ว · หากต้องการแก้ไขกรุณาติดต่อทีมงาน
            </Text>
          </Section>
        </ScrollView>

        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>

      {/* Edit shop info — native page-sheet (same shell as บัญชีของฉัน) */}
      <Modal visible={sheet} animationType="slide" presentationStyle="pageSheet" statusBarTranslucent navigationBarTranslucent onRequestClose={() => setSheet(false)}>
        <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "white" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <SheetHeader title="แก้ไขข้อมูลร้านค้า" onClose={() => setSheet(false)} onSave={saveProfile} canSave={canSave} />
          <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
            {/* Logo */}
            <View style={{ alignItems: "center", gap: 8 }}>
              <Pressable onPress={pickLogo} className="active:opacity-80">
                <View style={{ width: 92, height: 92, borderRadius: 46, backgroundColor: "rgba(49,151,84,0.1)", borderWidth: 2, borderColor: "rgba(49,151,84,0.3)", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                  <Image source={dLogo ? { uri: dLogo } : SHOP.logo} style={{ width: "100%", height: "100%" }} resizeMode="cover"
          resizeMethod="resize" />
                </View>
                <View style={{ position: "absolute", bottom: 0, right: 0, width: 30, height: 30, borderRadius: 15, backgroundColor: BRAND_GREEN, borderWidth: 2.5, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                  <Camera size={14} color="#fff" strokeWidth={2.2} />
                </View>
              </Pressable>
              <Text style={{ fontSize: 12, color: TEXT_MUTED }}>แตะเพื่อเปลี่ยนโลโก้ร้าน</Text>
            </View>

            <View style={{ gap: 8 }}>
              <FieldLabel>ชื่อร้านค้า</FieldLabel>
              <TextInput value={dName} onChangeText={setDName} placeholder="ชื่อร้านของคุณ" placeholderTextColor="#a3a3a3" style={INPUT} />
            </View>
            <View style={{ gap: 8 }}>
              <FieldLabel>คำอธิบายร้าน</FieldLabel>
              <TextInput value={dDesc} onChangeText={setDDesc} placeholder="อธิบายสั้นๆ เกี่ยวกับร้านของคุณ" placeholderTextColor="#a3a3a3" multiline textAlignVertical="top" style={[INPUT, { minHeight: 100, borderRadius: 20, paddingTop: 14 }]} />
            </View>
            <View style={{ gap: 8 }}>
              <FieldLabel>อีเมล</FieldLabel>
              <TextInput value={dEmail} onChangeText={setDEmail} placeholder="email@example.com" placeholderTextColor="#a3a3a3" autoCapitalize="none" keyboardType="email-address" style={INPUT} />
            </View>
            <View style={{ gap: 8 }}>
              <FieldLabel>เบอร์โทรศัพท์</FieldLabel>
              <TextInput value={dPhone} onChangeText={setDPhone} placeholder="0xx-xxx-xxxx" placeholderTextColor="#a3a3a3" keyboardType="phone-pad" style={INPUT} />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
