import { useMemo, useState, type ReactNode } from "react";
import { View, Text, TextInput, Pressable, ScrollView, Image, Alert, Switch, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import * as Haptics from "expo-haptics";
import { Banknote, Boxes, Coffee, FileText, Flame, ImagePlus, ListPlus, Minus, Plus, RotateCcw, Save, SlidersHorizontal, Sparkles, Star, Store, Trash2, X } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { BottomFade } from "../components/BottomFade";
import { GlassActionBar, PrimaryAction } from "../components/GlassActionBar";
import { showToast } from "../components/Toast";
import { SettingCard } from "./AddProductScreen";
import { BRAND_GREEN, PRICE_RED, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";
import { useStore } from "../store/db";
import {
  addCafeMenuItem,
  deleteCafeMenuItem,
  editCafeMenuItem,
  setCafeItemOff,
  cafeAdminStore,
  cafeOptionLibrary,
  type CafeItemTag,
  type CafeOptionGroup,
} from "../store/cafeAdmin";
import { adminCafeMenu, itemOptionRefs } from "../data/cafeAdminMenu";
import { CAFE_SUBS } from "../data/cafeMenu";
import { getImagePicker } from "../utils/imagePicker";
import type { RootStackParamList } from "../navigation/RootStack";

// Same form primitives as AddProductScreen / PromotionCreate / CouponCreate —
// copied per the reuse rule (each create page keeps its local copy today).
const INPUT = { backgroundColor: "#fafafa", borderRadius: 999, paddingHorizontal: 20, height: 48, fontSize: 14, color: "#0a0a0a" } as const;
const withCommas = (s: string) => (s ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : s);
const stripCommas = (s: string) => s.replace(/,/g, "");

export function FieldLabel({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <Text style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a", marginBottom: 8 }}>
      {children}
      {required ? <Text style={{ color: "#ff3b30" }}> *</Text> : null}
    </Text>
  );
}

export function Section({ Icon, tint = BRAND_GREEN, title, subtitle, children }: { Icon: typeof Coffee; tint?: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <View style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 16, gap: 14 }}>
      <View className="flex-row items-center" style={{ gap: 12 }}>
        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: `${tint}1a`, alignItems: "center", justifyContent: "center" }}>
          <Icon size={16} color={tint} strokeWidth={2.2} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: "600", color: "#000" }}>{title}</Text>
          {subtitle ? <Text style={{ fontSize: 11.5, color: TEXT_SECONDARY, marginTop: 1 }}>{subtitle}</Text> : null}
        </View>
      </View>
      {children}
    </View>
  );
}

// Pill chips — the app's single-choice selector (AddProductScreen's ChipSelect).
// Six café categories fit on screen, so picking one is a single tap; no sheet.
function ChipSelect({ options, value, onChange }: { options: { id: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <View className="flex-row" style={{ gap: 8, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <Pressable key={opt.id} onPress={() => onChange(opt.id)} className="active:opacity-80"
            style={{ paddingHorizontal: 14, height: 38, justifyContent: "center", borderRadius: 999, backgroundColor: active ? BRAND_GREEN : "#fafafa", borderWidth: 1, borderColor: active ? BRAND_GREEN : "#ececec" }}>
            <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Plain baht text field with a ฿ prefix — for cost / full price / tax. */
function MoneyInput({ value, onChange, placeholder = "0", suffix }: { value: string; onChange: (v: string) => void; placeholder?: string; suffix?: string }) {
  return (
    <View className="flex-row items-center" style={{ backgroundColor: "#fafafa", borderRadius: 999, height: 48, paddingHorizontal: 18, gap: 8 }}>
      {suffix ? null : <Text style={{ fontSize: 14, color: "#737373" }}>฿</Text>}
      <TextInput
        value={withCommas(value)}
        onChangeText={(t) => onChange(stripCommas(t).replace(/[^0-9.]/g, ""))}
        placeholder={placeholder}
        placeholderTextColor="#a3a3a3"
        keyboardType="numeric"
        style={{ flex: 1, fontSize: 14, color: "#0a0a0a", minWidth: 0, paddingVertical: 0 }}
      />
      {suffix ? <Text style={{ fontSize: 13, color: "#737373" }}>{suffix}</Text> : null}
    </View>
  );
}

// Local editable shape for ตัวเลือกเพิ่มเติม (prices stay strings while typing).
type DraftChoice = { name: string; price: string };
export type DraftGroup = { name: string; choices: DraftChoice[] };

/** A library group as this menu uses it: on/off + optional per-menu override. */
type RefDraft = { groupId: string; on: boolean; override: DraftGroup | null };

export const toDraft = (g: CafeOptionGroup): DraftGroup => ({
  name: g.name,
  choices: g.choices.map((c) => ({ name: c.name, price: c.price ? String(c.price) : "" })),
});
export const fromDraft = (g: DraftGroup): CafeOptionGroup => ({
  name: g.name.trim(),
  choices: g.choices.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), price: Number(stripCommas(c.price)) || 0 })),
});

/**
 * The editable rows for one option group — shared by ตัวเลือกเฉพาะเมนูนี้ and
 * by the per-menu override of a library group, so both read identically.
 */
export function GroupEditor({ value, onChange, onRemove, nameEditable = true }: { value: DraftGroup; onChange: (g: DraftGroup) => void; onRemove?: () => void; nameEditable?: boolean }) {
  const setChoice = (ci: number, patch: Partial<DraftChoice>) =>
    onChange({ ...value, choices: value.choices.map((c, j) => (j === ci ? { ...c, ...patch } : c)) });
  return (
    <View style={{ gap: 10 }}>
      {nameEditable ? (
        <View className="flex-row items-center" style={{ gap: 8 }}>
          <TextInput
            value={value.name}
            onChangeText={(t) => onChange({ ...value, name: t })}
            placeholder="ชื่อตัวเลือกเพิ่มเติม เช่น ความหวาน"
            placeholderTextColor="#a3a3a3"
            style={{ flex: 1, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 16, height: 42, fontSize: 13.5, fontWeight: "600", color: "#0a0a0a" }}
          />
          {onRemove ? (
            <Pressable onPress={onRemove} hitSlop={8} className="active:opacity-60" accessibilityLabel="ลบกลุ่มตัวเลือก">
              <Trash2 size={16} color="#9ca3af" strokeWidth={2.2} />
            </Pressable>
          ) : null}
        </View>
      ) : null}
      {value.choices.map((c, ci) => (
        <View key={ci} className="flex-row items-center" style={{ gap: 8 }}>
          <TextInput
            value={c.name}
            onChangeText={(t) => setChoice(ci, { name: t })}
            placeholder="ชื่อตัวเลือก เช่น +1 ช็อตกาแฟ"
            placeholderTextColor="#a3a3a3"
            style={{ flex: 1, backgroundColor: "#fff", borderRadius: 999, paddingHorizontal: 16, height: 40, fontSize: 13, color: "#0a0a0a" }}
          />
          <View className="flex-row items-center" style={{ width: 96, backgroundColor: "#fff", borderRadius: 999, height: 40, paddingHorizontal: 12, gap: 4 }}>
            <Text style={{ fontSize: 12.5, color: "#737373" }}>+฿</Text>
            <TextInput
              value={c.price}
              onChangeText={(t) => setChoice(ci, { price: t.replace(/[^0-9]/g, "") })}
              placeholder="0"
              placeholderTextColor="#a3a3a3"
              keyboardType="numeric"
              style={{ flex: 1, fontSize: 13, color: "#0a0a0a", minWidth: 0, paddingVertical: 0 }}
            />
          </View>
          <Pressable onPress={() => onChange({ ...value, choices: value.choices.filter((_, j) => j !== ci) })} hitSlop={8} className="active:opacity-60" accessibilityLabel="ลบตัวเลือก">
            <X size={15} color="#9ca3af" strokeWidth={2.4} />
          </Pressable>
        </View>
      ))}
      <Pressable onPress={() => onChange({ ...value, choices: [...value.choices, { name: "", price: "" }] })} className="flex-row items-center justify-center active:opacity-70" style={{ gap: 5, paddingVertical: 6 }}>
        <Plus size={14} color={BRAND_GREEN} strokeWidth={2.6} />
        <Text style={{ fontSize: 13, fontWeight: "600", color: BRAND_GREEN }}>เพิ่มตัวเลือก</Text>
      </Pressable>
    </View>
  );
}

function PriceStepper({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const bump = (d: number) => {
    onChange(String(Math.max(0, (parseFloat(value) || 0) + d)));
    Haptics.selectionAsync().catch(() => {});
  };
  return (
    <View className="flex-row items-center" style={{ backgroundColor: "#fafafa", borderRadius: 999, height: 46, paddingLeft: 18, paddingRight: 6, gap: 6 }}>
      <Text style={{ fontSize: 14, color: "#737373" }}>฿</Text>
      <TextInput value={withCommas(value)} onChangeText={(t) => onChange(stripCommas(t))} placeholder="0" placeholderTextColor="#a3a3a3" keyboardType="numeric" style={{ flex: 1, fontSize: 14, color: "#0a0a0a", minWidth: 0, paddingVertical: 0 }} />
      <View className="flex-row items-center" style={{ backgroundColor: "#fff", borderRadius: 999, height: 34, overflow: "hidden" }}>
        <Pressable onPress={() => bump(-5)} hitSlop={6} className="items-center justify-center active:opacity-70" style={{ width: 44, height: 34 }}>
          <Minus size={16} color="#0a0a0a" strokeWidth={2.6} />
        </Pressable>
        <View style={{ width: 1, height: 18, backgroundColor: "#e5e7eb" }} />
        <Pressable onPress={() => bump(5)} hitSlop={6} className="items-center justify-center active:opacity-70" style={{ width: 44, height: 34 }}>
          <Plus size={16} color="#0a0a0a" strokeWidth={2.6} />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * เพิ่ม/แก้ไขเมนู Meta Cafe (17.1) — the café counterpart of AddProductScreen:
 * same white Sections, pill inputs, ChipSelect and the floating Liquid Glass
 * save bar, so both create forms read as one system. Route: CafeMenuEdit
 * ({ itemId } = edit, absent = create).
 */
export function CafeMenuEditScreen() {
  const nav = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const insets = useSafeAreaInsets();
  const { itemId } = useRoute<RouteProp<RootStackParamList, "CafeMenuEdit">>().params ?? {};
  const item = useMemo(() => (itemId ? adminCafeMenu().find((i) => i.id === itemId) : undefined), [itemId]);
  const editing = !!item;
  const title = editing ? "แก้ไขเมนู" : "เพิ่มเมนูใหม่";
  // The header already says which mode this is, so the button just commits.
  const saveLabel = "บันทึก";

  const [name, setName] = useState(item?.name ?? "");
  const [desc, setDesc] = useState(item?.desc ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [subId, setSubId] = useState(item?.subId ?? CAFE_SUBS[0].id);
  const [selling, setSelling] = useState(!item?.off);
  // Admin-picked photo (uri). Falls back to a seed item's bundled image below.
  const [imageUri, setImageUri] = useState<string | null>(item?.imageUri ?? null);
  // Pricing block — parity with the web console's เพิ่มรายการสินค้า form.
  const [cost, setCost] = useState(item?.cost != null ? String(item.cost) : "");
  const [fullPrice, setFullPrice] = useState(item?.fullPrice != null ? String(item.fullPrice) : "");
  const [barcode, setBarcode] = useState(item?.barcode ?? "");
  // Inventory — ควบคุมสินค้าคงคลัง toggle + จำนวนสินค้าในคลัง.
  const [trackStock, setTrackStock] = useState(item?.trackStock ?? false);
  const [stockQty, setStockQty] = useState(item?.stockQty != null ? String(item.stockQty) : "");
  // Display tags (ลดราคา is derived from ราคาเต็ม, not a manual tag).
  const [tags, setTags] = useState<CafeItemTag[]>(
    item?.tags ?? (item?.popular ? ["bestseller"] : []),
  );
  const toggleTag = (t: CafeItemTag) => setTags((p) => (p.includes(t) ? p.filter((x) => x !== t) : [...p, t]));

  // ── ตัวเลือกเพิ่มเติม ──
  // Groups live in the shared คลังตัวเลือก; this form only records which ones
  // are on for this menu (+ an optional per-menu override), so creating a menu
  // needs no option setup and editing the library reaches every menu at once.
  const library = cafeOptionLibrary(useStore(cafeAdminStore));
  const [refs, setRefs] = useState<RefDraft[]>(() =>
    itemOptionRefs(item ?? { subId: CAFE_SUBS[0].id }, library).map((r) => ({
      groupId: r.groupId,
      on: r.on,
      override: r.override ? toDraft(r.override) : null,
    })),
  );
  // Refs for a category the admin picks after landing on a blank create form.
  const [refsTouched, setRefsTouched] = useState(false);
  const applyCategoryDefaults = (subId: string) => {
    if (editing || refsTouched) return;
    setRefs(itemOptionRefs({ subId }, library).map((r) => ({ groupId: r.groupId, on: r.on, override: null })));
  };
  const setRef = (groupId: string, patch: Partial<RefDraft>) => {
    setRefsTouched(true);
    setRefs((p) => p.map((r) => (r.groupId === groupId ? { ...r, ...patch } : r)));
  };

  // Menu-only groups — for a heading no other menu needs.
  const [extra, setExtra] = useState<DraftGroup[]>(() => (item?.extraGroups ?? []).map(toDraft));

  // ลดราคา preview — full price above sale price marks the item on sale.
  const saleP = Number(stripCommas(price)) || 0;
  const fullP = Number(stripCommas(fullPrice)) || 0;
  const discountPct = fullP > saleP && saleP > 0 ? Math.round(((fullP - saleP) / fullP) * 100) : 0;
  // กำไรต่อแก้ว — ต้นทุนมีความหมายก็ต่อเมื่อเทียบกับราคาขาย จึงสรุปให้ตรงนั้นเลย.
  const costP = Number(stripCommas(cost)) || 0;
  const profit = cost.trim() && saleP > 0 ? saleP - costP : null;
  const marginPct = profit != null && saleP > 0 ? Math.round((profit / saleP) * 100) : 0;

  const pickImage = async () => {
    const ImagePicker = getImagePicker();
    if (!ImagePicker) { Alert.alert("ไม่รองรับการเลือกรูป", "อุปกรณ์นี้ยังไม่รองรับการเลือกรูปภาพในโหมดนี้"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) setImageUri(res.assets[0].uri);
  };

  /** ลบเมนู — same confirm + toast + goBack contract as the list's ⋯ menu. */
  const onDelete = () => {
    if (!item) return;
    Alert.alert("ลบเมนู", `ต้องการลบ "${item.name}" ใช่หรือไม่?`, [
      { text: "ยกเลิก", style: "cancel" },
      {
        text: "ลบ",
        style: "destructive",
        onPress: () => {
          deleteCafeMenuItem(item.id);
          showToast(`ลบเมนู "${item.name}" แล้ว`, "info");
          if (nav.canGoBack()) nav.goBack();
        },
      },
    ]);
  };

  const onSave = () => {
    const n = name.trim();
    const p = Number(stripCommas(price));
    if (!n) return Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกชื่อเมนู");
    if (!Number.isFinite(p) || p <= 0) return Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกราคาขายให้ถูกต้อง");
    if (fullP > 0 && fullP < p) return Alert.alert("ราคาไม่ถูกต้อง", "ราคาเต็มต้องไม่ต่ำกว่าราคาขาย");
    if (trackStock && !stockQty.trim()) return Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกจำนวนสินค้าในคลัง");

    // Drop half-filled option rows so the storefront never sees a blank choice.
    const cleanExtra = extra.map(fromDraft).filter((g) => g.name && g.choices.length > 0);
    // An override that ended up identical to the library group is dropped, so
    // the menu goes back to tracking the library automatically.
    const cleanRefs = refs.map((r) => {
      const lib = library.find((g) => g.id === r.groupId);
      const ov = r.override ? fromDraft(r.override) : null;
      const same = ov && lib && JSON.stringify(ov.choices) === JSON.stringify(lib.choices);
      return ov && !same && ov.choices.length > 0
        ? { groupId: r.groupId, on: r.on, override: { name: lib?.name ?? ov.name, choices: ov.choices } }
        : { groupId: r.groupId, on: r.on };
    });

    const num = (s: string) => {
      const v = Number(stripCommas(s));
      return s.trim() && Number.isFinite(v) ? v : undefined;
    };
    const fields = {
      name: n,
      price: p,
      desc: desc.trim(),
      imageUri: imageUri ?? undefined,
      cost: num(cost),
      fullPrice: fullP > p ? fullP : undefined,
      barcode: barcode.trim() || undefined,
      trackStock,
      stockQty: trackStock ? num(stockQty) : undefined,
      tags,
      optionRefs: cleanRefs,
      extraGroups: cleanExtra,
      // Legacy per-item copies are superseded by the library refs above.
      optionGroups: undefined,
    };

    if (editing && item) {
      editCafeMenuItem(item.id, { ...fields, off: !selling });
    } else {
      const sub = CAFE_SUBS.find((s) => s.id === subId);
      const created = addCafeMenuItem({ ...fields, subId, mainId: sub?.mainId ?? "drink" });
      if (!selling) setCafeItemOff(created.id, true);
    }
    showToast(`${title} "${n}" เรียบร้อย`);
    if (nav.canGoBack()) nav.goBack();
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title={title} onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: insets.bottom + 110, gap: 8 }}
          // iOS insets the scroll view for the keyboard and scrolls the focused
          // field into view; without it a field below the fold sits behind the keys.
          // "interactive" lets a downward swipe dismiss it, and persistTaps means the
          // first tap on another field focuses it instead of only closing the keyboard.
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          {/* รูปภาพเมนู — same tile language as AddProductScreen's image picker */}
          <Section Icon={ImagePlus} title="รูปภาพเมนู" subtitle="ขนาด 1080×900 px (6:5) — JPG, PNG, WebP ไม่เกิน 2MB">
            <View className="flex-row" style={{ gap: 12 }}>
              <Pressable
                onPress={pickImage}
                className="active:opacity-80"
                style={{ width: "60%", aspectRatio: 6 / 5, borderRadius: 18, backgroundColor: "#f9f9f9", borderWidth: 2, borderColor: imageUri || item?.image != null ? BRAND_GREEN : "rgba(49,151,84,0.4)", borderStyle: imageUri || item?.image != null ? "solid" : "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
              >
                {imageUri ? (
                  <>
                    <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" resizeMethod="resize" />
                    {/* × reverts to the seed photo (or empty for a custom item) */}
                    <Pressable onPress={() => setImageUri(null)} hitSlop={8} style={{ position: "absolute", top: 6, left: 6, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
                      <X size={14} color="#fff" strokeWidth={2.4} />
                    </Pressable>
                  </>
                ) : item?.image != null ? (
                  <>
                    <Image source={item.image} style={{ width: "100%", height: "100%" }} resizeMode="cover" resizeMethod="resize" />
                    <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)", paddingVertical: 5 }}>
                      <Text style={{ fontSize: 10.5, fontWeight: "600", color: "#fff", textAlign: "center" }}>แตะเพื่อเปลี่ยนรูป</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e5e5", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 }}>
                      <Plus size={16} color={BRAND_GREEN} strokeWidth={2.4} />
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: "500", color: "#0a0a0a", marginTop: 8 }}>รูปปก</Text>
                    <Text style={{ fontSize: 10, color: "#bdbdbd", marginTop: 1 }}>หลัก</Text>
                  </>
                )}
              </Pressable>
            </View>
          </Section>

          {/* ข้อมูลเมนู */}
          <Section Icon={FileText} tint="#3b82f6" title="ข้อมูลเมนู">
            <View>
              <FieldLabel required>ชื่อเมนู</FieldLabel>
              <TextInput value={name} onChangeText={setName} placeholder="เช่น Iced Matcha Latte" placeholderTextColor="#a3a3a3" style={INPUT} />
            </View>
            <View>
              <FieldLabel>รายละเอียดสินค้า</FieldLabel>
              <TextInput value={desc} onChangeText={setDesc} placeholder="รายละเอียดสั้น ๆ ของเมนู" placeholderTextColor="#a3a3a3" style={INPUT} />
            </View>
            {/* Category is fixed after creation — the sub places the item in the
                customer menu + POS; store edits don't cover moving it. */}
            {!editing ? (
              <View>
                <FieldLabel required>หมวดหมู่</FieldLabel>
                <ChipSelect
                  options={CAFE_SUBS.map((s) => ({ id: s.id, label: s.label }))}
                  value={subId}
                  onChange={(v) => { setSubId(v); applyCategoryDefaults(v); }}
                />
              </View>
            ) : null}
            {/* บาร์โค้ด last — back-office metadata, not something customers see. */}
            <View>
              <FieldLabel>บาร์โค้ด</FieldLabel>
              <TextInput value={barcode} onChangeText={setBarcode} placeholder="เช่น 8850000000000" placeholderTextColor="#a3a3a3" keyboardType="numeric" style={INPUT} />
            </View>
          </Section>

          {/* ตั้งราคา — ราคาขาย (หลัก) → ราคาเต็ม (ลดราคา) → ต้นทุน (หลังบ้าน).
              ราคาขาย/ราคาเต็ม อยู่ติดกันเพราะป้ายลดราคาคำนวณจากทั้งคู่ (Law of
              Proximity); ต้นทุนเป็นข้อมูลภายในจึงปิดท้ายพร้อมกำไรต่อชิ้น. */}
          <Section Icon={Banknote} tint="#f59e0b" title="ตั้งราคา" subtitle="ตั้งราคาเต็มสูงกว่าราคาขายเพื่อติดป้ายลดราคา">
            <View>
              <FieldLabel required>ราคาขาย (บาท)</FieldLabel>
              <PriceStepper value={price} onChange={setPrice} />
            </View>
            <View>
              <FieldLabel>ราคาเต็ม (ก่อนลด)</FieldLabel>
              <MoneyInput value={fullPrice} onChange={setFullPrice} placeholder="เว้นว่างถ้าไม่ลดราคา" />
              {discountPct > 0 ? (
                <View className="flex-row items-center" style={{ gap: 6, marginTop: 8 }}>
                  <View style={{ backgroundColor: "rgba(230,46,5,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: PRICE_RED }}>ลดราคา -{discountPct}%</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: TEXT_MUTED }}>หน้าร้านจะแสดง ฿{saleP.toLocaleString()} พร้อมขีดฆ่า ฿{fullP.toLocaleString()}</Text>
                </View>
              ) : null}
            </View>
            <View>
              <FieldLabel>ต้นทุนต่อแก้ว</FieldLabel>
              <MoneyInput value={cost} onChange={setCost} placeholder="เว้นว่างได้ ใช้คำนวณกำไร" />
              {profit != null ? (
                <View className="flex-row items-center" style={{ gap: 6, marginTop: 8 }}>
                  <View style={{ backgroundColor: "rgba(49,151,84,0.1)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: BRAND_GREEN }}>กำไร ฿{profit.toLocaleString()}</Text>
                  </View>
                  <Text style={{ fontSize: 12, color: TEXT_MUTED }}>คิดเป็น {marginPct}% ของราคาขาย</Text>
                </View>
              ) : null}
            </View>
          </Section>

          {/* สินค้าคงคลัง */}
          <Section Icon={Boxes} tint="#0ea5e9" title="สินค้าคงคลัง">
            <SettingCard
              Icon={Boxes}
              label="ควบคุมสินค้าคงคลัง"
              value={trackStock}
              onValueChange={setTrackStock}
              accent="#0ea5e9"
            />
            {trackStock ? (
              <View>
                <FieldLabel required>สินค้าในคลัง (จำนวน)</FieldLabel>
                <MoneyInput value={stockQty} onChange={setStockQty} suffix="ชิ้น" />
              </View>
            ) : null}
          </Section>

          {/* ตัวเลือกเพิ่มเติม — เปิด/ปิดกลุ่มจากคลังกลาง แล้วปรับเฉพาะเมนูนี้ได้ */}
          <Section Icon={ListPlus} tint="#14b8a6" title="ตัวเลือกเพิ่มเติม" subtitle="เปิด-ปิดกลุ่มจากคลังตัวเลือก เมนูนี้จะได้ค่าล่าสุดจากคลังเสมอ">
            {library.map((g) => {
              const ref = refs.find((r) => r.groupId === g.id);
              if (!ref) return null;
              const draft = ref.override;
              return (
                <View key={g.id} style={{ backgroundColor: "#fafafa", borderRadius: 16, padding: 12, gap: draft || ref.on ? 10 : 0 }}>
                  <View className="flex-row items-center" style={{ gap: 12 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View className="flex-row items-center" style={{ gap: 6 }}>
                        <Text numberOfLines={1} style={{ fontSize: 13.5, fontWeight: "700", color: "#0a0a0a" }}>{draft?.name || g.name}</Text>
                        {draft ? (
                          <View style={{ backgroundColor: "rgba(20,184,166,0.12)", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 }}>
                            <Text style={{ fontSize: 10, fontWeight: "700", color: "#0d9488" }}>ปรับเฉพาะเมนูนี้</Text>
                          </View>
                        ) : null}
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 2 }}>
                        {(draft?.choices ?? g.choices).map((c) => c.name).filter(Boolean).join(" · ") || "ยังไม่มีตัวเลือก"}
                      </Text>
                    </View>
                    <Switch
                      value={ref.on}
                      onValueChange={(on) => setRef(g.id, { on })}
                      trackColor={{ true: BRAND_GREEN, false: "#d4d4d4" }}
                      {...(Platform.OS === "web" ? { activeThumbColor: "#fff" } : {})}
                    />
                  </View>

                  {ref.on ? (
                    draft ? (
                      <>
                        <GroupEditor value={draft} onChange={(v) => setRef(g.id, { override: v })} nameEditable={false} />
                        <Pressable onPress={() => setRef(g.id, { override: null })} className="flex-row items-center justify-center active:opacity-70" style={{ gap: 5, paddingVertical: 4 }}>
                          <RotateCcw size={13} color={TEXT_MUTED} strokeWidth={2.4} />
                          <Text style={{ fontSize: 12.5, fontWeight: "600", color: TEXT_MUTED }}>ใช้ค่าจากคลังตามเดิม</Text>
                        </Pressable>
                      </>
                    ) : (
                      <Pressable onPress={() => setRef(g.id, { override: toDraft(g) })} className="flex-row items-center justify-center active:opacity-70" style={{ gap: 5, paddingVertical: 4 }}>
                        <SlidersHorizontal size={13} color={BRAND_GREEN} strokeWidth={2.4} />
                        <Text style={{ fontSize: 12.5, fontWeight: "600", color: BRAND_GREEN }}>ปรับตัวเลือกเฉพาะเมนูนี้</Text>
                      </Pressable>
                    )
                  ) : null}
                </View>
              );
            })}

            {/* กลุ่มที่ใช้เฉพาะเมนูนี้ — ไม่เข้าไปอยู่ในคลัง */}
            {extra.map((g, gi) => (
              <View key={`extra-${gi}`} style={{ backgroundColor: "#fafafa", borderRadius: 16, padding: 12, gap: 10 }}>
                <GroupEditor
                  value={g}
                  onChange={(v) => setExtra((p) => p.map((x, i) => (i === gi ? v : x)))}
                  onRemove={() => setExtra((p) => p.filter((_, i) => i !== gi))}
                />
              </View>
            ))}
            <Pressable
              onPress={() => setExtra((p) => [...p, { name: "", choices: [{ name: "", price: "" }] }])}
              className="flex-row items-center justify-center active:opacity-70"
              style={{ height: 44, borderRadius: 999, borderWidth: 1, borderColor: BRAND_GREEN, gap: 6 }}
            >
              <Plus size={15} color={BRAND_GREEN} strokeWidth={2.6} />
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN }}>เพิ่มกลุ่มเฉพาะเมนูนี้</Text>
            </Pressable>

          </Section>

          {/* แท็กการแสดงผลหน้าร้าน */}
          <Section Icon={Store} tint="#DF9723" title="แท็กหน้าร้าน" subtitle="ป้ายที่โชว์บนการ์ดเมนู (ลดราคาติดให้อัตโนมัติจากราคาเต็ม)">
            {/* Same control as ตั้งค่าสินค้า in AddProductScreen / ShopProductDetail
                — a SettingCard per flag, tinted with that badge's own colour. */}
            <SettingCard Icon={Star} label="สินค้าแนะนำ" value={tags.includes("recommended")} onValueChange={() => toggleTag("recommended")} accent="#f7931d" />
            <SettingCard Icon={Flame} label="สินค้าขายดี" value={tags.includes("bestseller")} onValueChange={() => toggleTag("bestseller")} accent="#ea580c" />
            <SettingCard Icon={Sparkles} label="สินค้ามาใหม่" value={tags.includes("new")} onValueChange={() => toggleTag("new")} accent="#0284c7" />
          </Section>

          {/* ตั้งค่าเมนู */}
          <Section Icon={Store} tint="#8b5cf6" title="ตั้งค่าเมนู">
            <SettingCard
              Icon={Coffee}
              label="เปิดขายเมนูนี้"
              value={selling}
              onValueChange={setSelling}
              accent={BRAND_GREEN}
            />
          </Section>

          {/* ลบเมนู — last, and only when there's something to delete. Same
              centered red row as AccountScreen's ออกจากระบบ. */}
          {editing ? (
            <Pressable onPress={onDelete} className="flex-row items-center justify-center active:opacity-60" style={{ backgroundColor: "#fff", height: 56, gap: 8 }}>
              <Trash2 size={17} color="#ef4444" strokeWidth={2.2} />
              <Text style={{ fontSize: 15, fontWeight: "600", color: "#ef4444" }}>ลบเมนูนี้</Text>
            </Pressable>
          ) : null}
        </ScrollView>
        <HeaderFade />
        <BottomFade />
      </View>

      {/* Shared floating action bar — see components/GlassActionBar */}
      <GlassActionBar>
        <PrimaryAction label={saveLabel} onPress={onSave} icon={<Save size={17} color="#fff" strokeWidth={2.6} />} />
      </GlassActionBar>
    </View>
  );
}
