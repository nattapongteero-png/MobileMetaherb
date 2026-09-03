import { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator, Alert } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { LocateFixed, MapPin, Radio, Save, Search, Store, Timer } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { BottomFade } from "../components/BottomFade";
import { GlassActionBar, PrimaryAction } from "../components/GlassActionBar";
import { showToast } from "../components/Toast";
import { Section, FieldLabel } from "./CafeMenuEditScreen";
import { AreaMapPicker } from "../components/AreaMapPicker";
import { reverseGeocode, forwardGeocode } from "../utils/geocode";
import { getLocation } from "../utils/location";
import { PostalPicker } from "../components/PostalPicker";
import { SettingCard } from "./AddProductScreen";
import { BRAND_GREEN, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";
import { useStore } from "../store/db";
import { cafeAdminStore, cafeArea, setCafeArea, type CafeArea } from "../store/cafeAdmin";

const INPUT = { backgroundColor: "#fafafa", borderRadius: 999, paddingHorizontal: 20, height: 48, fontSize: 14, color: "#0a0a0a" } as const;

/** Pill row — the app's single-choice selector, typed to whatever ids you pass. */
function Chips<T extends string | number>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View className="flex-row" style={{ gap: 8, flexWrap: "wrap" }}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <Pressable key={String(opt.id)} onPress={() => onChange(opt.id)} className="active:opacity-80"
            style={{ paddingHorizontal: 14, height: 38, justifyContent: "center", borderRadius: 999, backgroundColor: active ? BRAND_GREEN : "#fafafa", borderWidth: 1, borderColor: active ? BRAND_GREEN : "#ececec" }}>
            <Text style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? "#fff" : TEXT_SECONDARY }}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/**
 * พื้นที่ขาย (17.9) — the shop's catchment and the banner a customer sees when
 * they walk into it.
 *
 * One branch, so this is a settings page rather than a list: a circle on the
 * map (จุดร้าน + รัศมี), the banner's own copy, and the rules that stop it
 * nagging — an office next door crosses the ring a dozen times a day, so the
 * cooldown and daily cap matter as much as the radius.
 *
 * Writes land immediately (same as ช่องทางชำระเงิน / เวลาเปิด-ปิดร้าน); there
 * is no save button to forget.
 */
export function CafeAreaScreen() {
  const nav = useNavigation();
  const insets = useSafeAreaInsets();
  const state = useStore(cafeAdminStore);
  const saved = cafeArea(state);
  // Edits live in a draft until บันทึก — a settings page with a save button that
  // saved as you typed would be lying about what the button does.
  const [draft, setDraft] = useState<CafeArea>(saved);
  const patch = (p: Partial<CafeArea>) => setDraft((d) => ({ ...d, ...p }));
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);

  const onSave = () => {
    setCafeArea(draft);
    showToast("บันทึกพื้นที่ขายแล้ว");
    if (nav.canGoBack()) nav.goBack();
  };

  // Reverse geocoding runs on every pin drop; a token guards against an older,
  // slower response landing after a newer one and overwriting a fresher address.
  const [lookingUp, setLookingUp] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [postalOpen, setPostalOpen] = useState(false);
  const lookupSeq = useRef(0);
  const fillAddress = async (la: number, ln: number) => {
    const seq = ++lookupSeq.current;
    setLookingUp(true);
    setLookupFailed(false);
    const found = await reverseGeocode(la, ln);
    if (seq !== lookupSeq.current) return; // a newer drop already won
    setLookingUp(false);
    // Say so rather than sitting silent — otherwise a failed lookup looks
    // identical to a pin that simply has no address behind it. The console line
    // lands in the Metro log, which is the only view into a device-side failure.
    if (!found) {
      console.warn("[cafeArea] reverse geocode failed", { lat: la, lng: ln });
      setLookupFailed(true);
      showToast("หาที่อยู่จากหมุดไม่ได้ · กรอกเองได้เลย", "error");
      return;
    }
    console.warn("[cafeArea] reverse geocode ok", found);
    showToast("อัปเดตที่อยู่ตามหมุดแล้ว", "info");
    // Moving the pin moves the address — every field follows, including the
    // street line. (The house number is re-typed after the pin is final; a
    // stale address next to a moved pin is the worse failure.)
    patch({
      addressLine: found.road,
      subdistrict: found.subdistrict,
      district: found.district,
      province: found.province,
      zip: found.zip,
    });
  };

  /**
   * The other direction: an address typed or picked here walks the pin over, so
   * the map and the fields can't drift apart. `moveSeq` drops stale answers the
   * same way the reverse lookup does.
   */
  const moveSeq = useRef(0);
  const movePinTo = async (parts: Partial<CafeArea>) => {
    const a = { ...draft, ...parts };
    const query = [a.addressLine, a.subdistrict, a.district, a.province, a.zip, "ประเทศไทย"]
      .map((x) => (x ?? "").trim())
      .filter(Boolean)
      .join(" ");
    const seq = ++moveSeq.current;
    const found = await forwardGeocode(query, { lat: draft.lat, lng: draft.lng });
    if (seq !== moveSeq.current || !found) return;
    patch({ lat: found.lat, lng: found.lng });
    showToast("ย้ายหมุดตามที่อยู่แล้ว", "info");
  };

  // ── ตำแหน่งของเครื่อง ──
  /** Where the device says it is — the blue dot; separate from the shop's pin. */
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const watchRef = useRef<{ remove: () => void } | null>(null);

  /** Follow the device while the screen is open, so the dot is simply there. */
  const startWatching = async () => {
    const Location = getLocation();
    if (!Location || watchRef.current) return;
    watchRef.current = await Location.watchPositionAsync(
      { accuracy: Location.Accuracy.Balanced, distanceInterval: 10 },
      (pos) => setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    );
  };

  // On open: show the dot straight away IF permission was already given. Asking
  // on arrival would be a prompt nobody asked for — the button below does that.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const Location = getLocation();
      if (!Location) return;
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted" || cancelled) return;
      await startWatching();
    })();
    return () => {
      cancelled = true;
      watchRef.current?.remove();
      watchRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** ย้ายหมุดร้านมาที่ตำแหน่งเรา — asks for permission the first time. */
  const useMyLocation = async () => {
    const Location = getLocation();
    if (!Location) {
      Alert.alert("ยังใช้ตำแหน่งไม่ได้", "แอปตัวนี้ยังไม่มีโมดูลตำแหน่ง — เปิดผ่าน Expo Go หรือ build ใหม่จาก Xcode");
      return;
    }
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("ไม่ได้รับอนุญาต", "เปิดสิทธิ์ตำแหน่งให้แอปในการตั้งค่าเครื่อง แล้วลองอีกครั้ง");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      patch({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      void fillAddress(pos.coords.latitude, pos.coords.longitude);
      void startWatching(); // keep the dot live from here on
    } catch {
      Alert.alert("หาตำแหน่งไม่สำเร็จ", "ลองใหม่อีกครั้ง หรือปักหมุดบนแผนที่เอง");
    } finally {
      setLocating(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="พื้นที่ขาย"
        subtitle={draft.enabled ? `รัศมี ${draft.radiusM} ม. จากร้าน` : "ปิดใช้งานอยู่"}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 8, gap: 8, paddingBottom: insets.bottom + 110 }}
          // iOS insets the scroll view for the keyboard and scrolls the focused
          // field into view; without it a field below the fold sits behind the keys.
          // "interactive" lets a downward swipe dismiss it, and persistTaps means the
          // first tap on another field focuses it instead of only closing the keyboard.
          automaticallyAdjustKeyboardInsets
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
        >
          {/* จุดร้าน */}
          <Section Icon={MapPin} tint="#ef4444" title="จุดร้าน" subtitle="จุดศูนย์กลางที่ใช้วัดระยะกับลูกค้า">
            <View>
              <FieldLabel>ชื่อสาขา</FieldLabel>
              <TextInput value={draft.name} onChangeText={(t) => patch({ name: t })} placeholder="เช่น Meta Cafe สาขาราษฎร์บูรณะ" placeholderTextColor="#a3a3a3" style={INPUT} />
            </View>
            {/* The map is the source of truth for the coordinates, and dropping
                the pin fills the four administrative fields below it. */}
            <AreaMapPicker
              lat={draft.lat}
              lng={draft.lng}
              radiusM={draft.radiusM}
              me={me}
              onChange={(la, ln) => {
                patch({ lat: la, lng: ln });
                void fillAddress(la, ln);
              }}
            />
            {/* The blue dot shows itself; this only moves the SHOP pin onto it —
                standing in the shop beats panning the map to find the building. */}
            <Pressable
              onPress={() => void useMyLocation()}
              disabled={locating}
              className="flex-row items-center justify-center active:opacity-70"
              style={{ height: 44, borderRadius: 999, borderWidth: 1, borderColor: BRAND_GREEN, gap: 7, opacity: locating ? 0.6 : 1 }}
            >
              {locating ? <ActivityIndicator size="small" color={BRAND_GREEN} /> : <LocateFixed size={16} color={BRAND_GREEN} strokeWidth={2.4} />}
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: BRAND_GREEN }}>
                {locating ? "กำลังหาตำแหน่ง…" : "ใช้ตำแหน่งปัจจุบัน"}
              </Text>
            </Pressable>

            <View>
              <View className="flex-row items-center" style={{ gap: 6, marginBottom: 8 }}>
                <Text style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a" }}>ที่อยู่</Text>
                <Text style={{ color: "#ff3b30" }}>*</Text>
                {lookingUp ? (
                  <>
                    <ActivityIndicator size="small" color={BRAND_GREEN} />
                    <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>กำลังค้นหาที่อยู่จากหมุด…</Text>
                  </>
                ) : lookupFailed ? (
                  <Text style={{ fontSize: 11.5, color: "#dc2626" }}>หาที่อยู่จากหมุดไม่ได้ · กรอกเองได้เลย</Text>
                ) : null}
              </View>
              <TextInput
                value={draft.addressLine}
                onChangeText={(t) => patch({ addressLine: t })}
                onBlur={() => void movePinTo({})}
                placeholder="บ้านเลขที่, หมู่ที่, ชื่ออาคาร, ซอย ถนน"
                placeholderTextColor="#a3a3a3"
                style={INPUT}
              />
            </View>

            {/* รหัสไปรษณีย์ — tapping opens the same search sheet the customer's
                address form uses, and one pick fills all four fields. */}
            <View>
              <FieldLabel required>รหัสไปรษณีย์</FieldLabel>
              <Pressable onPress={() => setPostalOpen(true)} className="flex-row items-center active:opacity-70" style={{ ...INPUT, paddingRight: 16 }}>
                <Text style={{ flex: 1, fontSize: 14, color: draft.zip ? "#0a0a0a" : "#a3a3a3" }}>
                  {draft.zip || "ค้นหาด้วยรหัสไปรษณีย์ หรือ ตำบล/อำเภอ"}
                </Text>
                <Search size={17} color="#8a8f8a" strokeWidth={2.2} />
              </Pressable>
            </View>

            <View>
              <FieldLabel required>ตำบล/แขวง</FieldLabel>
              <TextInput value={draft.subdistrict} onChangeText={(t) => patch({ subdistrict: t })} onBlur={() => void movePinTo({})} placeholder="ตำบล/แขวง" placeholderTextColor="#a3a3a3" style={INPUT} />
            </View>
            <View>
              <FieldLabel required>อำเภอ/เขต</FieldLabel>
              <TextInput value={draft.district} onChangeText={(t) => patch({ district: t })} onBlur={() => void movePinTo({})} placeholder="อำเภอ/เขต" placeholderTextColor="#a3a3a3" style={INPUT} />
            </View>
            <View>
              <FieldLabel required>จังหวัด</FieldLabel>
              <TextInput value={draft.province} onChangeText={(t) => patch({ province: t })} onBlur={() => void movePinTo({})} placeholder="จังหวัด" placeholderTextColor="#a3a3a3" style={INPUT} />
            </View>
          </Section>

          {/* รัศมี */}
          <Section Icon={Radio} tint="#0ea5e9" title="รัศมีพื้นที่" subtitle="ลูกค้าที่อยู่ในระยะนี้จะเห็นแบนเนอร์ร้าน">
            <Chips
              options={[
                { id: 200, label: "200 ม." },
                { id: 500, label: "500 ม." },
                { id: 1000, label: "1 กม." },
                { id: 2000, label: "2 กม." },
              ]}
              value={draft.radiusM}
              onChange={(v) => patch({ radiusM: v })}
            />
            <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>
              ร้านในห้างหรืออาคารสำนักงานควรใช้รัศมีกว้างกว่าร้านริมถนน เพราะลูกค้าอาจอยู่คนละชั้น
            </Text>
          </Section>

          {/* แบนเนอร์ */}
          {/* ความถี่ */}
          <Section Icon={Timer} tint="#8b5cf6" title="ช่วงเวลาแสดงแบนเนอร์" subtitle="แบนเนอร์จะอยู่บนหน้าแรกของลูกค้าที่อยู่ในรัศมี">
            <View>
              <Chips
                options={[
                  { id: "shop" as const, label: "ตามเวลาเปิด-ปิดร้าน" },
                  { id: "always" as const, label: "ตลอดเวลา" },
                ]}
                value={draft.activeHours}
                onChange={(v) => patch({ activeHours: v })}
              />
            </View>
          </Section>

          {/* ตั้งค่า + ทดสอบ */}
          <Section Icon={Store} tint={BRAND_GREEN} title="ตั้งค่าพื้นที่ขาย">
            <SettingCard Icon={MapPin} label="เปิดใช้งานพื้นที่ขาย" value={draft.enabled} onValueChange={(v) => patch({ enabled: v })} accent={BRAND_GREEN} />
          </Section>
        </ScrollView>
        <HeaderFade />
        <BottomFade />
      </View>

      {/* Shared floating action bar — see components/GlassActionBar */}
      <GlassActionBar>
        <PrimaryAction label="บันทึก" onPress={onSave} disabled={!dirty} icon={<Save size={17} color="#fff" strokeWidth={2.6} />} />
      </GlassActionBar>

      <PostalPicker
        visible={postalOpen}
        onClose={() => setPostalOpen(false)}
        onPick={(p) => {
          const parts = { zip: p.zip, subdistrict: p.subdistrict, district: p.district, province: p.province };
          setCafeArea(parts);
          void movePinTo(parts);
        }}
      />
    </View>
  );
}
