import { useState } from "react";
import { View, Text, Pressable, ScrollView, TextInput, Alert } from "react-native";
import {
  Store, User as UserIcon, MapPin, Bell, Truck, Mail, Phone, BadgeCheck, Check,
  Pencil, X, Camera, Package, ShoppingCart, Calendar as CalendarIcon, Wallet,
  MessageCircle, Megaphone, ShieldCheck, Smartphone, AlertTriangle, Clock, Settings as SettingsIcon,
} from "lucide-react-native";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_SECONDARY, TEXT_MUTED } from "../theme/tokens";

/* ── shared style atoms ─────────────────────────────────────────────── */
const CARD = { backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", padding: 16 } as const;
const PILL_INPUT = { backgroundColor: "#f5f5f5", height: 48, borderRadius: 999, paddingHorizontal: 18, fontSize: 14, color: "#374151" } as const;

/* ── module-scope sub-components (declared outside the screen to avoid focus loss) ── */

function Card({ children }: { children: React.ReactNode }) {
  return <View style={CARD}>{children}</View>;
}

function SectionHeader({ icon: Icon, title, right }: { icon: any; title: string; right?: React.ReactNode }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e8e8e8", marginBottom: 14 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
        <Icon size={16} color={BRAND_GREEN} strokeWidth={2.2} />
        <Text style={{ fontSize: 15, fontWeight: "600", color: "#0a0a0a" }}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

function EditToggle({ editing, onEdit, onCancel, onSave }: { editing: boolean; onEdit: () => void; onCancel: () => void; onSave: () => void }) {
  if (!editing) {
    return (
      <Pressable onPress={onEdit} hitSlop={8} className="flex-row items-center active:opacity-70" style={{ backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 14, height: 32, gap: 5 }}>
        <Pencil size={12} color={BRAND_GREEN} strokeWidth={2.4} />
        <Text style={{ fontSize: 12, fontWeight: "500", color: BRAND_GREEN }}>แก้ไข</Text>
      </Pressable>
    );
  }
  return (
    <View style={{ flexDirection: "row", gap: 8 }}>
      <Pressable onPress={onCancel} hitSlop={8} className="flex-row items-center active:opacity-70" style={{ backgroundColor: "#f3f4f6", borderRadius: 999, paddingHorizontal: 14, height: 32, gap: 5 }}>
        <X size={12} color={TEXT_SECONDARY} strokeWidth={2.4} />
        <Text style={{ fontSize: 12, fontWeight: "500", color: TEXT_SECONDARY }}>ยกเลิก</Text>
      </Pressable>
      <Pressable onPress={onSave} hitSlop={8} className="flex-row items-center active:opacity-80" style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, paddingHorizontal: 14, height: 32, gap: 5 }}>
        <Check size={13} color="#fff" strokeWidth={2.5} />
        <Text style={{ fontSize: 12, fontWeight: "500", color: "#fff" }}>บันทึก</Text>
      </Pressable>
    </View>
  );
}

function Field({ label, icon: Icon, value, editing, onChange, placeholder, keyboardType, autoCapitalize }: {
  label: string; icon?: any; value: string; editing: boolean; onChange: (v: string) => void;
  placeholder?: string; keyboardType?: "default" | "email-address" | "phone-pad" | "number-pad"; autoCapitalize?: "none" | "sentences";
}) {
  return (
    <View style={{ gap: 6, flex: 1 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
        {Icon && <Icon size={12} color="#9ca3af" strokeWidth={2.4} />}
        <Text style={{ fontSize: 12, color: TEXT_MUTED }}>{label}</Text>
      </View>
      {editing ? (
        <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor="#a3a3a3"
          keyboardType={keyboardType} autoCapitalize={autoCapitalize}
          style={PILL_INPUT} />
      ) : (
        <View style={{ backgroundColor: "#fafafa", height: 48, justifyContent: "center", paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: "#f0f0f0" }}>
          <Text style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a" }} numberOfLines={1}>{value || "-"}</Text>
        </View>
      )}
    </View>
  );
}

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <Pressable onPress={onToggle} hitSlop={6} className="active:opacity-80">
      <View style={{ width: 50, height: 30, borderRadius: 15, padding: 2, backgroundColor: on ? "#34c759" : "#e5e5ea" }}>
        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: "#fff", transform: [{ translateX: on ? 20 : 0 }] }} />
      </View>
    </Pressable>
  );
}

function Stepper({ value, onChange, step = 50 }: { value: number; onChange: (v: number) => void; step?: number }) {
  return (
    <View style={{ backgroundColor: "#fafafa", height: 48, borderRadius: 999, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingLeft: 18, paddingRight: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: "500", color: "#374151" }}>{value.toLocaleString()}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", height: 34, width: 92, borderRadius: 999, overflow: "hidden" }}>
        <Pressable onPress={() => onChange(Math.max(0, value - step))} hitSlop={4} className="active:opacity-60" style={{ flex: 1, height: "100%", backgroundColor: "rgba(116,116,128,0.08)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18, color: "#000", lineHeight: 20 }}>−</Text>
        </Pressable>
        <View style={{ width: 1, height: 22, backgroundColor: "rgba(60,60,67,0.3)" }} />
        <Pressable onPress={() => onChange(value + step)} hitSlop={4} className="active:opacity-60" style={{ flex: 1, height: "100%", backgroundColor: "rgba(116,116,128,0.08)", alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontSize: 18, color: "#000", lineHeight: 20 }}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

/* ── DATA (ported verbatim from web) ─────────────────────────────────── */
type SectionId = "shop_account" | "shop_address" | "notifications" | "shipping";

const SECTION_TABS: { id: SectionId; label: string; icon: any }[] = [
  { id: "shop_account", label: "บัญชีร้านค้า", icon: UserIcon },
  { id: "shop_address", label: "ที่อยู่ร้านค้า", icon: MapPin },
  { id: "notifications", label: "การแจ้งเตือน", icon: Bell },
  { id: "shipping", label: "การจัดส่ง", icon: Truck },
];

type NotifChannel = "inApp" | "email" | "sms";
interface NotifItem { key: string; label: string; desc: string; enabled: boolean; channels: Record<NotifChannel, boolean> }
interface NotifCategory { id: string; label: string; desc: string; Icon: any; color: string; items: NotifItem[] }

const initialCategories: NotifCategory[] = [
  {
    id: "orders", label: "คำสั่งซื้อ", desc: "การแจ้งเตือนที่เกี่ยวกับออเดอร์ของลูกค้า", Icon: ShoppingCart, color: "#319754",
    items: [
      { key: "order_new", label: "คำสั่งซื้อใหม่", desc: "เมื่อมีลูกค้าสั่งซื้อสินค้าใหม่", enabled: true, channels: { inApp: true, email: true, sms: true } },
      { key: "order_status", label: "สถานะคำสั่งซื้อเปลี่ยน", desc: "เมื่อสถานะออเดอร์มีการเปลี่ยนแปลง", enabled: true, channels: { inApp: true, email: false, sms: false } },
      { key: "order_cancel", label: "ออเดอร์ยกเลิก", desc: "เมื่อลูกค้าหรือร้านยกเลิกออเดอร์", enabled: true, channels: { inApp: true, email: true, sms: false } },
      { key: "order_complete", label: "ออเดอร์สำเร็จ", desc: "เมื่อลูกค้าได้รับสินค้าและปิดออเดอร์", enabled: false, channels: { inApp: true, email: false, sms: false } },
    ],
  },
  {
    id: "finance", label: "การเงิน", desc: "การแจ้งเตือนที่เกี่ยวกับยอดเงินในบัญชี", Icon: Wallet, color: "#0088ff",
    items: [
      { key: "fin_release", label: "ปล่อยยอดเข้าบัญชี", desc: "เมื่อยอด Escrow ถูกปล่อยเข้ายอดพร้อมถอน", enabled: true, channels: { inApp: true, email: true, sms: false } },
      { key: "fin_withdraw", label: "ถอนเงินสำเร็จ", desc: "เมื่อการถอนเงินเข้าบัญชีธนาคารเสร็จสมบูรณ์", enabled: true, channels: { inApp: true, email: true, sms: true } },
      { key: "fin_fee", label: "ค่าธรรมเนียม GP", desc: "เมื่อมีการเรียกเก็บค่าธรรมเนียม", enabled: false, channels: { inApp: true, email: false, sms: false } },
    ],
  },
  {
    id: "inventory", label: "สต็อกสินค้า", desc: "การแจ้งเตือนเกี่ยวกับสต็อกและสินค้า", Icon: Package, color: "#9747ff",
    items: [
      { key: "inv_low", label: "สินค้าใกล้หมด", desc: "เมื่อสินค้าเหลือต่ำกว่าจำนวนที่กำหนด (10 ชิ้น)", enabled: true, channels: { inApp: true, email: true, sms: false } },
      { key: "inv_out", label: "สินค้าหมดสต็อก", desc: "เมื่อสินค้าหมดสต็อกอย่างสมบูรณ์", enabled: true, channels: { inApp: true, email: true, sms: true } },
      { key: "inv_flash_end", label: "Flash Sale สิ้นสุด", desc: "เมื่อแคมเปญ Flash Sale ใกล้/สิ้นสุด", enabled: true, channels: { inApp: true, email: false, sms: false } },
    ],
  },
  {
    id: "customer", label: "ลูกค้า", desc: "การโต้ตอบกับลูกค้า — ข้อความ, รีวิว, ร้องเรียน", Icon: MessageCircle, color: "#ff9500",
    items: [
      { key: "cus_message", label: "ข้อความแชทใหม่", desc: "เมื่อลูกค้าส่งข้อความเข้ามาในแชท", enabled: true, channels: { inApp: true, email: false, sms: false } },
      { key: "cus_review", label: "รีวิวสินค้าใหม่", desc: "เมื่อลูกค้ารีวิวสินค้าหลังได้รับ", enabled: true, channels: { inApp: true, email: true, sms: false } },
      { key: "cus_complaint", label: "การร้องเรียนใหม่", desc: "เมื่อลูกค้าส่งคำร้องเรียน (refund/damaged)", enabled: true, channels: { inApp: true, email: true, sms: true } },
    ],
  },
  {
    id: "marketing", label: "การตลาด & โปรโมชัน", desc: "การแจ้งเตือนแคมเปญและคูปอง", Icon: Megaphone, color: "#e62e05",
    items: [
      { key: "mkt_promo_end", label: "โปรโมชันสิ้นสุด", desc: "เมื่อโปรโมชันใกล้/สิ้นสุดเวลา", enabled: false, channels: { inApp: true, email: false, sms: false } },
      { key: "mkt_coupon_end", label: "คูปองหมดอายุ", desc: "เมื่อคูปองในระบบใกล้หมดอายุ (3 วัน)", enabled: false, channels: { inApp: true, email: false, sms: false } },
      { key: "mkt_top_product", label: "สินค้าขายดี", desc: "เมื่อสินค้าของคุณติด Top 10 ในหมวด", enabled: true, channels: { inApp: true, email: true, sms: false } },
    ],
  },
  {
    id: "system", label: "ระบบ & ความปลอดภัย", desc: "การแจ้งเตือนเกี่ยวกับระบบและบัญชี", Icon: ShieldCheck, color: "#737373",
    items: [
      { key: "sys_update", label: "อัปเดตระบบ", desc: "เมื่อมีการอัปเดตหรือฟีเจอร์ใหม่", enabled: true, channels: { inApp: true, email: false, sms: false } },
      { key: "sys_maint", label: "การบำรุงรักษาระบบ", desc: "แจ้งล่วงหน้าก่อนปิดปรับปรุงระบบ", enabled: true, channels: { inApp: true, email: true, sms: false } },
      { key: "sys_security", label: "ความปลอดภัยบัญชี", desc: "เข้าสู่ระบบจากอุปกรณ์ใหม่ / เปลี่ยนรหัสผ่าน", enabled: true, channels: { inApp: true, email: true, sms: true } },
    ],
  },
];

const channelMeta: Record<NotifChannel, { label: string; Icon: any; color: string }> = {
  inApp: { label: "ใน-แอป", Icon: Bell, color: "#319754" },
  email: { label: "อีเมล", Icon: Mail, color: "#0088ff" },
  sms: { label: "SMS", Icon: Smartphone, color: "#9747ff" },
};

interface CarrierConfig {
  id: string; name: string; code: string; color: string;
  baseRate: number; perKg: number; cod: boolean; estimatedDays: string; trackingUrl: string; enabled: boolean;
}

const initialCarriers: CarrierConfig[] = [
  { id: "thpost", name: "ไปรษณีย์ไทย", code: "TH", color: "#f8201e", baseRate: 35, perKg: 10, cod: true, estimatedDays: "2-4 วัน", trackingUrl: "track.thailandpost.co.th", enabled: true },
  { id: "kerry", name: "Kerry Express", code: "K", color: "#ff6600", baseRate: 50, perKg: 15, cod: true, estimatedDays: "1-3 วัน", trackingUrl: "th.kerryexpress.com", enabled: true },
  { id: "flash", name: "Flash Express", code: "F", color: "#fdc70d", baseRate: 30, perKg: 10, cod: true, estimatedDays: "1-2 วัน", trackingUrl: "flashexpress.com", enabled: false },
  { id: "jt", name: "J&T Express", code: "J&T", color: "#d40511", baseRate: 40, perKg: 12, cod: true, estimatedDays: "1-3 วัน", trackingUrl: "jtexpress.co.th", enabled: false },
  { id: "dhl", name: "DHL Express", code: "DHL", color: "#ffcc00", baseRate: 120, perKg: 50, cod: false, estimatedDays: "1 วัน", trackingUrl: "dhl.com/th-th", enabled: false },
];

/* ── SHOP ACCOUNT SECTION ────────────────────────────────────────────── */
function ShopAccountSection() {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("METAHERB Store");
  const [email, setEmail] = useState("METAHERB@gmail.com");
  const [phone, setPhone] = useState("090-000-0000");
  const [tagline, setTagline] = useState("ร้านค้าสมุนไพรออร์แกนิก เพื่อสุขภาพที่ดีของทุกคน");

  const save = () => { setEditing(false); Alert.alert("บันทึกแล้ว", "อัปเดตข้อมูลร้านค้าเรียบร้อย"); };

  const stats = [
    { Icon: Package, label: "สินค้า", value: "248", color: "#319754" },
    { Icon: ShoppingCart, label: "ออเดอร์", value: "1,432", color: "#0088ff" },
    { Icon: CalendarIcon, label: "เริ่ม", value: "2566", color: "#9747ff" },
  ];

  return (
    <View style={{ gap: 14 }}>
      {/* Profile card */}
      <Card>
        <View style={{ alignItems: "center", gap: 10 }}>
          <View style={{ position: "relative" }}>
            <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: "rgba(49,151,84,0.1)", borderWidth: 3, borderColor: "#fff", alignItems: "center", justifyContent: "center" }}>
              <Store size={42} color={BRAND_GREEN} strokeWidth={1.8} />
            </View>
            <Pressable onPress={() => Alert.alert("เปลี่ยนรูปโปรไฟล์", "เลือกรูปจากคลัง (อยู่ระหว่างพัฒนา)")} hitSlop={6} className="active:opacity-80"
              style={{ position: "absolute", bottom: 0, right: 0, width: 34, height: 34, borderRadius: 17, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center", borderWidth: 3, borderColor: "#fff" }}>
              <Camera size={15} color="#fff" strokeWidth={2.4} />
            </Pressable>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#000" }}>{name}</Text>
            <BadgeCheck size={20} color={BRAND_GREEN} fill={BRAND_GREEN} strokeWidth={2.4} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(49,151,84,0.1)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
            <Check size={11} color={BRAND_GREEN} strokeWidth={3} />
            <Text style={{ fontSize: 10, fontWeight: "600", color: BRAND_GREEN }}>ร้านค้ายืนยันแล้ว</Text>
          </View>
          <Text style={{ fontSize: 12, color: "#525252", textAlign: "center", fontStyle: "italic", paddingHorizontal: 8 }}>"{tagline}"</Text>

          {/* Stats grid */}
          <View style={{ flexDirection: "row", gap: 1, backgroundColor: "#f0f0f0", borderRadius: 16, overflow: "hidden", marginTop: 6, borderWidth: 1, borderColor: "#f0f0f0", width: "100%" }}>
            {stats.map((s) => (
              <View key={s.label} style={{ flex: 1, backgroundColor: "#fff", paddingVertical: 12, alignItems: "center", gap: 4 }}>
                <View style={{ width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: `${s.color}1a` }}>
                  <s.Icon size={14} color={s.color} strokeWidth={2.4} />
                </View>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#000" }}>{s.value}</Text>
                <Text style={{ fontSize: 10, color: "#737373" }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </Card>

      {/* Form */}
      <Card>
        <SectionHeader icon={UserIcon} title="ข้อมูลบัญชี" right={<EditToggle editing={editing} onEdit={() => setEditing(true)} onCancel={() => setEditing(false)} onSave={save} />} />
        <View style={{ gap: 14 }}>
          <Field label="ชื่อร้านค้า" icon={Store} value={name} editing={editing} onChange={setName} placeholder="ชื่อร้านของคุณ" />
          <Field label="คำอธิบายร้าน" icon={Pencil} value={tagline} editing={editing} onChange={setTagline} placeholder="อธิบายสั้นๆ เกี่ยวกับร้านของคุณ" />
          <Field label="อีเมล" icon={Mail} value={email} editing={editing} onChange={setEmail} placeholder="email@example.com" keyboardType="email-address" autoCapitalize="none" />
          <Field label="เบอร์โทรศัพท์" icon={Phone} value={phone} editing={editing} onChange={setPhone} placeholder="0xx-xxx-xxxx" keyboardType="phone-pad" />
        </View>
      </Card>
    </View>
  );
}

/* ── SHOP ADDRESS SECTION ────────────────────────────────────────────── */
function ShopAddressSection() {
  const [editing, setEditing] = useState(false);
  const [houseNo, setHouseNo] = useState("459/153");
  const [village, setVillage] = useState("หมู่บ้านนิวไฮบ์");
  const [road, setRoad] = useState("สุขสวัสดิ์");
  const [subdistrict, setSubdistrict] = useState("ราษฎร์บูรณะ");
  const [district, setDistrict] = useState("ราษฎร์บูรณะ");
  const [province, setProvince] = useState("กรุงเทพมหานคร");
  const [postalCode, setPostalCode] = useState("10140");

  const save = () => { setEditing(false); Alert.alert("บันทึกแล้ว", "อัปเดตที่อยู่ร้านค้าเรียบร้อย"); };

  const fullAddress = [houseNo, village, road && `ถ.${road}`, subdistrict && `แขวง${subdistrict}`, district && `เขต${district}`, province, postalCode]
    .filter(Boolean).join(" ");

  return (
    <View style={{ gap: 14 }}>
      {/* Address summary */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
          <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
            <MapPin size={20} color={BRAND_GREEN} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: "#737373" }}>ที่อยู่ร้านค้า</Text>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#000", marginTop: 2, lineHeight: 21 }}>{fullAddress || "ยังไม่ได้กรอกที่อยู่"}</Text>
          </View>
        </View>
      </Card>

      {/* Form */}
      <Card>
        <SectionHeader icon={MapPin} title="ข้อมูลที่อยู่" right={<EditToggle editing={editing} onEdit={() => setEditing(true)} onCancel={() => setEditing(false)} onSave={save} />} />

        <View style={{ flexDirection: "row", gap: 10, backgroundColor: "rgba(0,136,255,0.05)", borderWidth: 1, borderColor: "rgba(0,136,255,0.2)", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 14 }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "rgba(0,136,255,0.15)", alignItems: "center", justifyContent: "center", marginTop: 1 }}>
            <Text style={{ fontSize: 10, fontWeight: "700", color: "#0088ff" }}>i</Text>
          </View>
          <Text style={{ flex: 1, fontSize: 12, color: "#374151", lineHeight: 18 }}>ที่อยู่นี้จะใช้แสดงในหน้าโปรไฟล์ร้านและเป็นข้อมูลอ้างอิงทางธุรกิจ โปรดระบุให้ถูกต้องและครบถ้วน</Text>
        </View>

        <View style={{ gap: 14 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Field label="บ้านเลขที่" value={houseNo} editing={editing} onChange={setHouseNo} placeholder="เช่น 459/153" />
            <Field label="หมู่บ้าน / อาคาร" value={village} editing={editing} onChange={setVillage} placeholder="เช่น หมู่บ้านนิวไฮบ์" />
          </View>
          <Field label="ถนน" value={road} editing={editing} onChange={setRoad} placeholder="เช่น สุขสวัสดิ์" />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Field label="ตำบล / แขวง" value={subdistrict} editing={editing} onChange={setSubdistrict} placeholder="ตำบล/แขวง" />
            <Field label="อำเภอ / เขต" value={district} editing={editing} onChange={setDistrict} placeholder="อำเภอ/เขต" />
          </View>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Field label="จังหวัด" value={province} editing={editing} onChange={setProvince} placeholder="จังหวัด" />
            <Field label="รหัสไปรษณีย์" value={postalCode} editing={editing} onChange={setPostalCode} placeholder="xxxxx" keyboardType="number-pad" />
          </View>
        </View>
      </Card>
    </View>
  );
}

/* ── NOTIFICATIONS SECTION ───────────────────────────────────────────── */
function NotificationsSection() {
  const [categories, setCategories] = useState<NotifCategory[]>(initialCategories);

  const toggleItem = (catId: string, itemKey: string) =>
    setCategories((prev) => prev.map((c) => c.id !== catId ? c : { ...c, items: c.items.map((it) => it.key !== itemKey ? it : { ...it, enabled: !it.enabled }) }));
  const toggleChannel = (catId: string, itemKey: string, ch: NotifChannel) =>
    setCategories((prev) => prev.map((c) => c.id !== catId ? c : { ...c, items: c.items.map((it) => it.key !== itemKey ? it : { ...it, channels: { ...it.channels, [ch]: !it.channels[ch] } }) }));

  return (
    <View style={{ gap: 14 }}>
      {categories.map((cat) => (
        <View key={cat.id} style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: "#ececed", overflow: "hidden" }}>
          {/* Category header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 16, borderBottomWidth: 1, borderBottomColor: "#f0f0f0", backgroundColor: `${cat.color}08` }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, alignItems: "center", justifyContent: "center", backgroundColor: `${cat.color}1a` }}>
              <cat.Icon size={20} color={cat.color} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#000" }}>{cat.label}</Text>
              <Text style={{ fontSize: 12, color: "#737373", marginTop: 2 }}>{cat.desc}</Text>
            </View>
            <Text style={{ fontSize: 11, color: "#9ca3af" }}>
              <Text style={{ color: cat.color, fontWeight: "600" }}>{cat.items.filter((i) => i.enabled).length}</Text>
              {` / ${cat.items.length}`}
            </Text>
          </View>

          {/* Items */}
          {cat.items.map((item, idx) => (
            <View key={item.key} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12, padding: 16, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: "#f5f5f5", backgroundColor: item.enabled ? "#fff" : "rgba(249,250,251,0.5)" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: item.enabled ? "#000" : "#9ca3af" }}>{item.label}</Text>
                <Text style={{ fontSize: 12, color: "#737373", marginTop: 2 }}>{item.desc}</Text>
                {item.enabled && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10, flexWrap: "wrap" }}>
                    <Text style={{ fontSize: 11, color: "#9ca3af" }}>ส่งผ่าน</Text>
                    {(Object.keys(channelMeta) as NotifChannel[]).map((ch) => {
                      const meta = channelMeta[ch];
                      const active = item.channels[ch];
                      return (
                        <Pressable key={ch} onPress={() => toggleChannel(cat.id, item.key, ch)} hitSlop={4} className="flex-row items-center active:opacity-70"
                          style={{ gap: 5, paddingHorizontal: 10, height: 26, borderRadius: 999, backgroundColor: active ? `${meta.color}1a` : "#f3f4f6" }}>
                          <meta.Icon size={12} color={active ? meta.color : "#9ca3af"} strokeWidth={2.4} />
                          <Text style={{ fontSize: 11, fontWeight: active ? "600" : "500", color: active ? meta.color : "#9ca3af" }}>{meta.label}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                )}
              </View>
              <Toggle on={item.enabled} onToggle={() => toggleItem(cat.id, item.key)} />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/* ── SHIPPING SECTION ────────────────────────────────────────────────── */
function ShippingSection() {
  const [carriers, setCarriers] = useState<CarrierConfig[]>(initialCarriers);
  const [freeShippingMin, setFreeShippingMin] = useState(500);
  const [baseShippingCost, setBaseShippingCost] = useState(35);
  const [defaultWeight, setDefaultWeight] = useState(500);
  const [codFee, setCodFee] = useState(20);
  const [codEnabled, setCodEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [pickupHours, setPickupHours] = useState("จันทร์–ศุกร์ 09:00–18:00 น.");
  const [pickupNote, setPickupNote] = useState("กรุณาแจ้งเลขออเดอร์ที่หน้าร้านเพื่อรับสินค้า");
  const [remoteEnabled, setRemoteEnabled] = useState(false);
  const [remoteFee, setRemoteFee] = useState(150);

  const pickupAddress = "459/153 ถ.สุขสวัสดิ์ แขวงราษฎร์บูรณะ เขตราษฎร์บูรณะ กรุงเทพฯ 10140";
  const toggleCarrier = (id: string) => setCarriers((prev) => prev.map((c) => c.id === id ? { ...c, enabled: !c.enabled } : c));
  const enabledCount = carriers.filter((c) => c.enabled).length;

  return (
    <View style={{ gap: 14 }}>
      {/* General */}
      <Card>
        <SectionHeader icon={SettingsIcon} title="ค่าจัดส่งเริ่มต้น" />
        <View style={{ gap: 14 }}>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Package size={12} color="#9ca3af" strokeWidth={2.4} />
              <Text style={{ fontSize: 12, color: TEXT_MUTED }}>ส่งฟรีเมื่อซื้อครบ (฿)</Text>
            </View>
            <Stepper value={freeShippingMin} onChange={setFreeShippingMin} />
            <Text style={{ fontSize: 10, color: "#9ca3af", paddingLeft: 12 }}>0 = ปิดใช้งานส่งฟรี</Text>
          </View>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Wallet size={12} color="#9ca3af" strokeWidth={2.4} />
              <Text style={{ fontSize: 12, color: TEXT_MUTED }}>ค่าจัดส่งเริ่มต้น (฿)</Text>
            </View>
            <Stepper value={baseShippingCost} onChange={setBaseShippingCost} step={5} />
          </View>
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Truck size={12} color="#9ca3af" strokeWidth={2.4} />
              <Text style={{ fontSize: 12, color: TEXT_MUTED }}>น้ำหนักเริ่มต้น (กรัม)</Text>
            </View>
            <Stepper value={defaultWeight} onChange={setDefaultWeight} step={100} />
          </View>
        </View>
      </Card>

      {/* Carriers */}
      <Card>
        <SectionHeader icon={Truck} title="ผู้ให้บริการขนส่ง" right={
          <Text style={{ fontSize: 11, color: "#9ca3af" }}>
            <Text style={{ color: BRAND_GREEN, fontWeight: "600" }}>{enabledCount}</Text>
            {` / ${carriers.length} ขนส่ง`}
          </Text>
        } />
        <View style={{ gap: 12 }}>
          {carriers.map((c) => (
            <View key={c.id} style={{ borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb" }}>
              {/* Brand header */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, padding: 14, backgroundColor: c.enabled ? c.color : "#9ca3af" }}>
                <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: c.enabled ? c.color : "#9ca3af", letterSpacing: c.code.length > 2 ? -0.5 : 0 }}>{c.code}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ fontSize: 17, fontWeight: "700", color: "#fff" }}>{c.name}</Text>
                    {c.cod && (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                        <ShieldCheck size={10} color={BRAND_GREEN} strokeWidth={2.4} />
                        <Text style={{ fontSize: 10, fontWeight: "600", color: "#000" }}>COD</Text>
                      </View>
                    )}
                  </View>
                  <Text style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", marginTop: 2 }} numberOfLines={1}>{c.trackingUrl}</Text>
                </View>
              </View>
              {/* Body */}
              <View style={{ backgroundColor: "#fff", padding: 14, gap: 12 }}>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb" }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: "#1f2937" }}>เปิดใช้งานขนส่งนี้</Text>
                  <Toggle on={c.enabled} onToggle={() => toggleCarrier(c.id)} />
                </View>
                <View style={{ flexDirection: "row", gap: 18 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: "#737373" }}>ค่าส่งเริ่มต้น</Text>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: c.enabled ? "#000" : "#9ca3af", marginTop: 2 }}>฿{c.baseRate}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: "#737373" }}>ต่อ กก.</Text>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: c.enabled ? "#000" : "#9ca3af", marginTop: 2 }}>฿{c.perKg}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 10, color: "#737373" }}>เวลาจัดส่ง</Text>
                    <Text style={{ fontSize: 14, fontWeight: "600", color: c.enabled ? "#000" : "#9ca3af", marginTop: 2 }}>{c.estimatedDays}</Text>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>
      </Card>

      {/* Pickup */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e8e8e8", marginBottom: pickupEnabled ? 14 : 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Store size={20} color={BRAND_GREEN} strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#000" }}>รับสินค้าที่ร้าน</Text>
                <View style={{ backgroundColor: BRAND_GREEN, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: "#fff" }}>ฟรี</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: "#737373", marginTop: 2 }}>ให้ลูกค้ามารับสินค้าเองที่ร้าน</Text>
            </View>
          </View>
          <Toggle on={pickupEnabled} onToggle={() => setPickupEnabled((v) => !v)} />
        </View>
        {pickupEnabled && (
          <View style={{ gap: 14 }}>
            <View style={{ flexDirection: "row", gap: 10, backgroundColor: "rgba(49,151,84,0.05)", borderWidth: 1, borderColor: "rgba(49,151,84,0.2)", borderRadius: 12, padding: 12 }}>
              <MapPin size={16} color={BRAND_GREEN} strokeWidth={2.2} style={{ marginTop: 1 }} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 11, fontWeight: "600", color: BRAND_GREEN_DARK }}>จุดรับสินค้า</Text>
                <Text style={{ fontSize: 12, color: "#374151", marginTop: 2, lineHeight: 18 }}>{pickupAddress}</Text>
              </View>
            </View>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Clock size={12} color="#9ca3af" strokeWidth={2.4} />
                <Text style={{ fontSize: 12, color: TEXT_MUTED }}>เวลาเปิดให้รับสินค้า</Text>
              </View>
              <TextInput value={pickupHours} onChangeText={setPickupHours} placeholder="เช่น จันทร์–ศุกร์ 09:00–18:00 น." placeholderTextColor="#a3a3a3" style={{ ...PILL_INPUT, backgroundColor: "#fafafa" }} />
            </View>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <MessageCircle size={12} color="#9ca3af" strokeWidth={2.4} />
                <Text style={{ fontSize: 12, color: TEXT_MUTED }}>หมายเหตุถึงลูกค้า</Text>
              </View>
              <TextInput value={pickupNote} onChangeText={setPickupNote} placeholder="ข้อความที่จะแสดงให้ลูกค้าเห็น" placeholderTextColor="#a3a3a3" style={{ ...PILL_INPUT, backgroundColor: "#fafafa" }} />
            </View>
          </View>
        )}
      </Card>

      {/* Remote area */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e8e8e8", marginBottom: remoteEnabled ? 14 : 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(0,136,255,0.1)", alignItems: "center", justifyContent: "center" }}>
              <MapPin size={20} color="#0088ff" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={{ fontSize: 15, fontWeight: "600", color: "#000" }}>จัดส่งพื้นที่ห่างไกล</Text>
                <View style={{ backgroundColor: "rgba(0,136,255,0.1)", borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 10, fontWeight: "600", color: "#0088ff" }}>ราคาเหมา</Text>
                </View>
              </View>
              <Text style={{ fontSize: 11, color: "#737373", marginTop: 2 }}>เกาะ / พื้นที่จัดส่งยาก</Text>
            </View>
          </View>
          <Toggle on={remoteEnabled} onToggle={() => setRemoteEnabled((v) => !v)} />
        </View>
        {remoteEnabled && (
          <View style={{ gap: 14 }}>
            <View style={{ gap: 6 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Wallet size={12} color="#9ca3af" strokeWidth={2.4} />
                <Text style={{ fontSize: 12, color: TEXT_MUTED }}>ค่าจัดส่งเหมาจ่าย (฿)</Text>
              </View>
              <Stepper value={remoteFee} onChange={setRemoteFee} />
            </View>
            <View style={{ flexDirection: "row", gap: 10, backgroundColor: "rgba(0,136,255,0.05)", borderWidth: 1, borderColor: "rgba(0,136,255,0.2)", borderRadius: 12, padding: 14 }}>
              <AlertTriangle size={16} color="#0088ff" strokeWidth={2.2} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 11, color: "#525252", lineHeight: 17 }}>ค่าส่งจะถูก override เป็นราคาเหมา (฿{remoteFee.toLocaleString()}) ทันที เมื่อระบบตรวจพบที่อยู่อยู่ในรายการพื้นที่ห่างไกล</Text>
            </View>
          </View>
        )}
      </Card>

      {/* COD */}
      <Card>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "#e8e8e8", marginBottom: codEnabled ? 14 : 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flex: 1 }}>
            <View style={{ width: 40, height: 40, borderRadius: 14, backgroundColor: "rgba(255,149,0,0.1)", alignItems: "center", justifyContent: "center" }}>
              <Wallet size={20} color="#ff9500" strokeWidth={2.2} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#000" }}>เก็บเงินปลายทาง (COD)</Text>
              <Text style={{ fontSize: 11, color: "#737373", marginTop: 2 }}>รับชำระเงินเมื่อลูกค้าได้รับสินค้า</Text>
            </View>
          </View>
          <Toggle on={codEnabled} onToggle={() => setCodEnabled((v) => !v)} />
        </View>
        {codEnabled && (
          <View style={{ gap: 14 }}>
            <View style={{ gap: 6 }}>
              <Text style={{ fontSize: 12, color: TEXT_MUTED }}>ค่าธรรมเนียม COD (฿)</Text>
              <Stepper value={codFee} onChange={setCodFee} step={5} />
            </View>
            <View style={{ flexDirection: "row", gap: 10, backgroundColor: "rgba(255,149,0,0.05)", borderWidth: 1, borderColor: "rgba(255,149,0,0.2)", borderRadius: 12, padding: 14 }}>
              <AlertTriangle size={16} color="#ff9500" strokeWidth={2.2} style={{ marginTop: 1 }} />
              <Text style={{ flex: 1, fontSize: 11, color: "#525252", lineHeight: 17 }}>ออเดอร์ COD มีโอกาสถูกปฏิเสธรับสินค้าสูงกว่า แนะนำให้เก็บค่าธรรมเนียมเพื่อชดเชยความเสี่ยง</Text>
            </View>
          </View>
        )}
      </Card>
    </View>
  );
}

/* ── MAIN SCREEN ─────────────────────────────────────────────────────── */
export function SettingsScreen() {
  const [active, setActive] = useState<SectionId>("shop_account");

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <ScrollView showsVerticalScrollIndicator={false} contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>

        {/* Section switcher */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {SECTION_TABS.map((tab) => {
            const isActive = active === tab.id;
            return (
              <Pressable key={tab.id} onPress={() => setActive(tab.id)} hitSlop={4} className="flex-row items-center active:opacity-70"
                style={{ gap: 6, paddingHorizontal: 14, height: 38, borderRadius: 999, backgroundColor: isActive ? BRAND_GREEN : "#fff", borderWidth: 1, borderColor: isActive ? BRAND_GREEN : "#ececed" }}>
                <tab.icon size={15} color={isActive ? "#fff" : TEXT_SECONDARY} strokeWidth={2.2} />
                <Text style={{ fontSize: 13, fontWeight: "600", color: isActive ? "#fff" : TEXT_SECONDARY }}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {active === "shop_account" && <ShopAccountSection />}
        {active === "shop_address" && <ShopAddressSection />}
        {active === "notifications" && <NotificationsSection />}
        {active === "shipping" && <ShippingSection />}
      </ScrollView>
    </View>
  );
}

export default SettingsScreen;
