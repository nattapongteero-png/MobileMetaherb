import { useState } from "react";
import { View, Text, ScrollView, Pressable, TextInput, Image, Switch, Alert, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation } from "@react-navigation/native";
import { ImagePlus, Images, Plus, Trash2, X } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { HeaderFade } from "../components/HeaderFade";
import { BottomSheet } from "../components/BottomSheet";
import { EmptyState } from "../components/EmptyState";
import { showToast } from "../components/Toast";
import { BRAND_GREEN, DIVIDER_GRAY, TEXT_MUTED, TEXT_SECONDARY } from "../theme/tokens";
import { useStore } from "../store/db";
import {
  cafeAdminStore,
  cafeBanners,
  addCafeBanner,
  editCafeBanner,
  deleteCafeBanner,
  CAFE_BANNER_SLOTS,
  type CafeBanner,
  type CafeBannerSlot,
} from "../store/cafeAdmin";
import { getImagePicker } from "../utils/imagePicker";

const INPUT = { backgroundColor: "#fafafa", borderRadius: 999, paddingHorizontal: 20, height: 48, fontSize: 14, color: "#0a0a0a" } as const;

/** One banner card — 16:9 image, title row, สถานะการใช้งาน switch, delete. */
function BannerCard({ banner, onEdit }: { banner: CafeBanner; onEdit: () => void }) {
  const remove = () =>
    Alert.alert("ลบ Banner", `ต้องการลบ "${banner.title}" ใช่หรือไม่?`, [
      { text: "ยกเลิก", style: "cancel" },
      { text: "ลบ", style: "destructive", onPress: () => deleteCafeBanner(banner.id) },
    ]);

  return (
    <Pressable onPress={onEdit} className="active:opacity-90" style={{ backgroundColor: "#fff", borderRadius: 16, borderWidth: 1, borderColor: DIVIDER_GRAY, overflow: "hidden", opacity: banner.enabled ? 1 : 0.6 }}>
      {banner.imageUri ? (
        <Image source={{ uri: banner.imageUri }} style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#f5f5f5" }} resizeMode="cover" resizeMethod="resize" />
      ) : (
        <View style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "rgba(49,151,84,0.08)", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <Images size={28} color={BRAND_GREEN} strokeWidth={1.8} />
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>ยังไม่มีภาพประกอบ — แตะเพื่ออัพโหลด</Text>
        </View>
      )}
      <View className="flex-row items-center" style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: "#0a0a0a" }}>{banner.title}</Text>
          <Text style={{ fontSize: 11.5, color: banner.enabled ? BRAND_GREEN : TEXT_MUTED, marginTop: 1 }}>
            {banner.enabled ? "กำลังแสดงบนหน้าร้าน" : "ปิดการใช้งาน"}
          </Text>
        </View>
        <Pressable onPress={remove} hitSlop={8} className="active:opacity-60" accessibilityLabel={`ลบ ${banner.title}`}>
          <Trash2 size={16} color="#9ca3af" strokeWidth={2.2} />
        </Pressable>
        <Switch
          value={banner.enabled}
          onValueChange={(on) => editCafeBanner(banner.id, { enabled: on })}
          trackColor={{ true: BRAND_GREEN, false: "#d4d4d4" }}
          {...(Platform.OS === "web" ? { activeThumbColor: "#fff" } : {})}
        />
      </View>
    </Pressable>
  );
}

/**
 * จัดการ Banner หน้าร้าน — parity with the web console's banner uploads
 * (อัพโหลดเมนูแนะนำวันนี้ / เมนูมาใหม่ / เมนูทั่วไป,เมนูลดราคา): three slots,
 * each holding image banners with a ชื่อ Banner and a สถานะการใช้งาน switch.
 */
export function CafeBannersScreen() {
  const nav = useNavigation();
  const state = useStore(cafeAdminStore);
  const banners = cafeBanners(state);

  // Sheet state: null = closed; {slot} = adding into slot; {banner} = editing.
  const [sheet, setSheet] = useState<{ banner?: CafeBanner; slot: CafeBannerSlot } | null>(null);
  const [title, setTitle] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);

  const openAdd = (slot: CafeBannerSlot) => {
    setTitle("");
    setImageUri(null);
    setSheet({ slot });
  };
  const openEdit = (banner: CafeBanner) => {
    setTitle(banner.title);
    setImageUri(banner.imageUri ?? null);
    setSheet({ banner, slot: banner.slot });
  };

  const pickImage = async () => {
    const ImagePicker = getImagePicker();
    if (!ImagePicker) { Alert.alert("ไม่รองรับการเลือกรูป", "อุปกรณ์นี้ยังไม่รองรับการเลือกรูปภาพในโหมดนี้"); return; }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
    if (!res.canceled && res.assets?.[0]) setImageUri(res.assets[0].uri);
  };

  const save = () => {
    if (!sheet) return;
    const t = title.trim();
    if (!t) return Alert.alert("กรอกข้อมูลไม่ครบ", "กรุณากรอกชื่อ Banner");
    if (sheet.banner) {
      editCafeBanner(sheet.banner.id, { title: t, imageUri: imageUri ?? undefined });
      showToast(`บันทึก Banner "${t}" แล้ว`);
    } else {
      addCafeBanner({ title: t, slot: sheet.slot, imageUri: imageUri ?? undefined, enabled: true });
      showToast(`เพิ่ม Banner "${t}" แล้ว`);
    }
    setSheet(null);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="แบนเนอร์หน้าร้าน"
        subtitle={banners.length === 0 ? "ยังไม่มี Banner" : `ทั้งหมด ${banners.length} · เปิดใช้ ${banners.filter((b) => b.enabled).length}`}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />

      <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
        {CAFE_BANNER_SLOTS.map((slot) => {
          const slotBanners = banners.filter((b) => b.slot === slot.id);
          return (
            <View key={slot.id} style={{ gap: 10 }}>
              <View className="flex-row items-center" style={{ gap: 8 }}>
                <Text style={{ flex: 1, fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>{slot.label}</Text>
                <Pressable
                  onPress={() => openAdd(slot.id)}
                  className="flex-row items-center active:opacity-80"
                  style={{ height: 32, borderRadius: 999, paddingLeft: 10, paddingRight: 12, gap: 4, backgroundColor: "rgba(49,151,84,0.1)" }}
                >
                  <Plus size={14} color={BRAND_GREEN} strokeWidth={2.6} />
                  <Text style={{ fontSize: 12.5, fontWeight: "700", color: BRAND_GREEN }}>อัพโหลด</Text>
                </Pressable>
              </View>
              {slotBanners.length === 0 ? (
                <View style={{ borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#d4d4d4", paddingVertical: 22, alignItems: "center", gap: 4 }}>
                  <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ยังไม่มี Banner ในส่วนนี้</Text>
                  <Text style={{ fontSize: 11.5, color: "#a3a3a3" }}>กด "อัพโหลด" เพื่อเพิ่มภาพแรก</Text>
                </View>
              ) : (
                slotBanners.map((b) => <BannerCard key={b.id} banner={b} onEdit={() => openEdit(b)} />)
              )}
            </View>
          );
        })}

        {banners.length === 0 ? (
          <EmptyState
            icon={<Images size={36} color="#9ca3af" />}
            title="ภาพแบนเนอร์จะแสดงบนหน้าคาเฟ่ของลูกค้า"
            subtitle="อัพโหลดภาพ 16:9 แยกตามส่วน แนะนำวันนี้ · มาใหม่ · ทั่วไป/ลดราคา"
            iconBgSize={64}
          />
        ) : null}
      </ScrollView>
      <HeaderFade />
      </View>

      {/* Add / edit sheet — image tile + ชื่อ Banner */}
      <BottomSheet visible={sheet !== null} onClose={() => setSheet(null)} title={sheet?.banner ? "แก้ไข Banner" : "เพิ่ม Banner"} centerTitle>
        <View style={{ paddingHorizontal: 16, gap: 14, paddingBottom: 8 }}>
          <Text style={{ fontSize: 12.5, color: TEXT_SECONDARY }}>
            ส่วน: {CAFE_BANNER_SLOTS.find((s) => s.id === sheet?.slot)?.label}
          </Text>
          <Pressable
            onPress={pickImage}
            className="active:opacity-80"
            style={{ width: "100%", aspectRatio: 16 / 9, borderRadius: 18, backgroundColor: "#f9f9f9", borderWidth: 2, borderColor: imageUri ? BRAND_GREEN : "rgba(49,151,84,0.4)", borderStyle: imageUri ? "solid" : "dashed", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
          >
            {imageUri ? (
              <>
                <Image source={{ uri: imageUri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" resizeMethod="resize" />
                <Pressable onPress={() => setImageUri(null)} hitSlop={8} style={{ position: "absolute", top: 8, left: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
                  <X size={14} color="#fff" strokeWidth={2.4} />
                </Pressable>
              </>
            ) : (
              <>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e5e5", alignItems: "center", justifyContent: "center" }}>
                  <ImagePlus size={16} color={BRAND_GREEN} strokeWidth={2.4} />
                </View>
                <Text style={{ fontSize: 12, fontWeight: "500", color: "#0a0a0a", marginTop: 8 }}>อัพโหลดภาพประกอบ</Text>
                <Text style={{ fontSize: 10, color: "#bdbdbd", marginTop: 1 }}>แนะนำสัดส่วน 16:9</Text>
              </>
            )}
          </Pressable>
          <View>
            <Text style={{ fontSize: 14, fontWeight: "500", color: "#0a0a0a", marginBottom: 8 }}>
              ชื่อ Banner <Text style={{ color: "#ff3b30" }}>*</Text>
            </Text>
            <TextInput value={title} onChangeText={setTitle} placeholder="เช่น โปรเปิดร้านลด 20%" placeholderTextColor="#a3a3a3" style={INPUT} />
          </View>
          <Pressable onPress={save} className="active:opacity-80" style={{ height: 48, borderRadius: 999, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>บันทึก</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </View>
  );
}
