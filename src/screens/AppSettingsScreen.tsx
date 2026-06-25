import { View, Text, Pressable, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Bell, ShieldCheck, Smartphone, Users, LifeBuoy, Flag, Globe, CreditCard, Lock, FileText, ChevronRight, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { BRAND_GREEN, TEXT_MUTED } from "../theme/tokens";
import { useLang, LANGUAGES } from "../context/LanguageContext";
import { useSecurity } from "../context/SecurityContext";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

type RowDef = { key: string; subKey: string; Icon: LucideIcon; route: keyof RootStackParamList; gate?: boolean };
const GROUPS: { titleKey: string; rows: RowDef[] }[] = [
  {
    titleKey: "grp_general",
    rows: [
      { key: "set_notifications", subKey: "set_notifications_sub", Icon: Bell, route: "NotificationSettings" },
      { key: "set_language", subKey: "set_language_sub", Icon: Globe, route: "Language" },
      { key: "set_security", subKey: "set_security_sub", Icon: Lock, route: "SecuritySettings" },
    ],
  },
  {
    titleKey: "grp_payment",
    rows: [
      { key: "set_payment", subKey: "set_payment_sub", Icon: CreditCard, route: "PaymentAccounts", gate: true },
    ],
  },
  {
    titleKey: "grp_support",
    rows: [
      { key: "set_help", subKey: "set_help_sub", Icon: LifeBuoy, route: "HelpCenter" },
      { key: "set_report", subKey: "set_report_sub", Icon: Flag, route: "ReportProblem" },
    ],
  },
  {
    titleKey: "grp_about",
    rows: [
      { key: "set_privacy", subKey: "set_privacy_sub", Icon: ShieldCheck, route: "PrivacyPolicy" },
      { key: "set_terms", subKey: "set_terms_sub", Icon: FileText, route: "TermsOfService" },
      { key: "set_appinfo", subKey: "set_appinfo_sub", Icon: Smartphone, route: "AppInfo" },
      { key: "set_about", subKey: "set_about_sub", Icon: Users, route: "About" },
    ],
  },
];

export function AppSettingsScreen() {
  const nav = useNavigation<Nav>();
  const { t, lang } = useLang();
  const { requirePin } = useSecurity();
  const currentLang = LANGUAGES.find((l) => l.code === lang);

  const openRow = async (r: RowDef) => {
    if (r.gate) {
      const ok = await requirePin("ยืนยันรหัส PIN เพื่อเข้าหน้าการชำระเงิน");
      if (!ok) return;
    }
    (nav.navigate as any)(r.route);
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader title={t("settings")} onBack={() => nav.canGoBack() && nav.goBack()} showSearch={false} />
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}>
          {GROUPS.map((group) => (
            <View key={group.titleKey}>
              <Text style={{ fontSize: 12.5, fontWeight: "700", color: TEXT_MUTED, paddingHorizontal: 16, marginTop: 18, marginBottom: 6 }}>{t(group.titleKey)}</Text>
              <View style={{ backgroundColor: "#fff" }}>
                {group.rows.map((r, i) => {
                  const sub = r.route === "Language" ? (currentLang?.name ?? t(r.subKey)) : t(r.subKey);
                  return (
                    <View key={r.key}>
                      {i > 0 ? <View style={{ height: 1, backgroundColor: "#f0f0f0", marginLeft: 60 }} /> : null}
                      <Pressable onPress={() => openRow(r)} className="flex-row items-center active:opacity-60" style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 12 }}>
                        <View style={{ width: 36, height: 36, borderRadius: 12, backgroundColor: "rgba(49,151,84,0.1)", alignItems: "center", justifyContent: "center" }}>
                          <r.Icon size={19} color={BRAND_GREEN} strokeWidth={2.2} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 15, color: "#0a0a0a", fontWeight: "500" }}>{t(r.key)}</Text>
                          <Text style={{ fontSize: 12, color: TEXT_MUTED, marginTop: 1 }}>{sub}</Text>
                        </View>
                        <ChevronRight size={18} color="#c4c4c6" strokeWidth={2.2} />
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
          <Text style={{ fontSize: 12, color: TEXT_MUTED, textAlign: "center", marginTop: 24 }}>METAHERB · {t("set_version")} 1.0.0</Text>
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
      </View>
    </View>
  );
}
