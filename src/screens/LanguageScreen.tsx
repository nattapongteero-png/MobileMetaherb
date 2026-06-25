import { View, Text, Pressable, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { Check } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { useLang, LANGUAGES } from "../context/LanguageContext";

export function LanguageScreen() {
  const nav = useNavigation();
  const { lang, setLang, t } = useLang();

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title={t("lang_title")} onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={{ fontSize: 12.5, color: TEXT_MUTED, paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4 }}>{t("lang_choose")}</Text>
          <View style={{ backgroundColor: "#fff", marginTop: 4 }}>
            {LANGUAGES.map((l, i) => {
              const active = lang === l.code;
              return (
                <View key={l.code}>
                  {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0", marginLeft: 16 }} /> : null}
                  <Pressable onPress={() => setLang(l.code)} className="flex-row items-center active:opacity-60" style={{ paddingHorizontal: 16, paddingVertical: 15, gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15.5, color: "#0a0a0a", fontWeight: active ? "700" : "500" }}>{l.name}</Text>
                      <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }}>{l.native}</Text>
                    </View>
                    {active ? (
                      <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
                        <Check size={15} color="#fff" strokeWidth={3} />
                      </View>
                    ) : (
                      <View style={{ width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: "#d4d4d8" }} />
                    )}
                  </Pressable>
                </View>
              );
            })}
          </View>
          <Text style={{ fontSize: 11.5, color: TEXT_MUTED, paddingHorizontal: 16, marginTop: 14, lineHeight: 17 }}>{t("lang_note")}</Text>
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>
    </View>
  );
}
