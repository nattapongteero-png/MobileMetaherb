import { useState } from "react";
import { View, Text, Image, Pressable, ScrollView } from "react-native";
import { StatusBar } from "expo-status-bar";
import { GlassView } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { FileText, ClipboardList, FileCheck2, Package, AlertCircle, type LucideIcon } from "lucide-react-native";
import { SubPageHeader } from "../components/SubPageHeader";
import { PressableScale } from "../components/PressableScale";
import { BottomFade } from "../components/BottomFade";
import { BRAND_GREEN, BRAND_GREEN_DARK, TEXT_MUTED } from "../theme/tokens";
import {
  DOC_TITLE, DOC_TABS, docsForKind, statusBadge, PRIORITY_STYLE,
  type DocKind, type AnyDoc, type PRRecord, type QuoteRecord,
} from "../data/b2bDocs";
import { useBuyerQuotes, useBuyerPurchaseOrders } from "../data/quoteView";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DocsRoute = RouteProp<RootStackParamList, "B2BDocs">;

const KIND_ICON: Record<DocKind, LucideIcon> = { rfq: FileText, pr: ClipboardList, po: FileCheck2 };

function FilterChips({ tabs, active, setActive, countFor }: {
  tabs: { key: string; label: string }[];
  active: string;
  setActive: (k: string) => void;
  countFor: (k: string) => number;
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}>
      {tabs.map((tb) => {
        const isActive = active === tb.key;
        const count = countFor(tb.key);
        return (
          <PressableScale key={tb.key} onPress={() => setActive(tb.key)} scaleTo={0.92}>
            <GlassView glassEffectStyle="regular" colorScheme="light"
              tintColor={isActive ? "rgba(49,151,84,0.22)" : "rgba(255,255,255,0.5)"} isInteractive
              style={{ height: 34, paddingHorizontal: 16, borderRadius: 999, overflow: "hidden", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: isActive ? "rgba(49,151,84,0.45)" : "rgba(0,0,0,0.06)" }}>
              <Text style={{ fontSize: 13, fontWeight: isActive ? "700" : "500", color: isActive ? BRAND_GREEN_DARK : "#374151" }}>{tb.label}</Text>
              {count > 0 ? (
                <View style={{ minWidth: 17, height: 17, paddingHorizontal: 4, borderRadius: 9, backgroundColor: isActive ? "rgba(38,122,67,0.16)" : "rgba(0,0,0,0.07)", alignItems: "center", justifyContent: "center" }}>
                  <Text style={{ fontSize: 10, fontWeight: "700", color: isActive ? BRAND_GREEN_DARK : "#374151", lineHeight: 13 }}>{count}</Text>
                </View>
              ) : null}
            </GlassView>
          </PressableScale>
        );
      })}
    </ScrollView>
  );
}

function DocCard({ kind, doc, onPress }: { kind: DocKind; doc: AnyDoc; onPress: () => void }) {
  const Icon = KIND_ICON[kind];
  const badge = statusBadge(kind, (doc as any).status);
  const shown = doc.items.slice(0, 2);
  const pr = kind === "pr" ? (doc as PRRecord) : null;
  const qt = kind === "rfq" ? (doc as QuoteRecord) : null;
  const daysColor = qt ? (qt.daysRemaining <= 7 ? "#dc2626" : qt.daysRemaining <= 30 ? "#d97706" : "#319754") : "";

  return (
    <Pressable onPress={onPress} className="active:opacity-90"
      style={{ backgroundColor: "#fff", borderRadius: 18, borderWidth: 1, borderColor: "#ececed", padding: 14 }}>
      {/* Header: document code + status */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
          <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
            <Icon size={14} color="#fff" strokeWidth={2.4} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: "700", color: "#0a0a0a", flex: 1 }} numberOfLines={1}>{doc.id}</Text>
        </View>
        {badge ? (
          <View style={{ backgroundColor: badge.color + "1a", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 }}>
            <Text style={{ fontSize: 11, fontWeight: "700", color: badge.color }}>{badge.label}</Text>
          </View>
        ) : null}
      </View>

      {/* Meta: priority / days + date */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          {pr ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: PRIORITY_STYLE[pr.priority].bg, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
              {pr.priority === "Urgent" ? <AlertCircle size={10} color={PRIORITY_STYLE[pr.priority].color} strokeWidth={2.6} /> : null}
              <Text style={{ fontSize: 10.5, fontWeight: "700", color: PRIORITY_STYLE[pr.priority].color }}>{pr.priority}</Text>
            </View>
          ) : null}
          {qt && qt.daysRemaining >= 0 ? (
            <View style={{ backgroundColor: daysColor + "1a", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 }}>
              <Text style={{ fontSize: 10.5, fontWeight: "700", color: daysColor }}>เหลือ {qt.daysRemaining} วัน</Text>
            </View>
          ) : null}
        </View>
        <Text style={{ fontSize: 11.5, color: TEXT_MUTED }}>{doc.date}</Text>
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Items preview */}
      <View style={{ gap: 12 }}>
        {shown.map((item, i) => (
          <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
            <View style={{ width: 52, height: 52, borderRadius: 12, overflow: "hidden", backgroundColor: "#f0f0f0", alignItems: "center", justifyContent: "center" }}>
              {item.image ? (
                <Image source={typeof item.image === "string" ? { uri: item.image } : item.image} style={{ width: "100%", height: "100%" }} resizeMode="cover"
          resizeMethod="resize" />
              ) : (
                <Package size={20} color="#d4d4d4" />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13.5, fontWeight: "500", color: "#0a0a0a" }} numberOfLines={1}>{item.name}</Text>
              <Text style={{ fontSize: 11.5, color: TEXT_MUTED, marginTop: 3 }} numberOfLines={1}>จำนวน {item.qty.toLocaleString()} {item.unit}</Text>
            </View>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#0a0a0a" }}>฿{(item.price * item.qty).toLocaleString()}</Text>
          </View>
        ))}
        {doc.items.length > 2 ? (
          <Text style={{ fontSize: 12, color: TEXT_MUTED, textAlign: "center" }}>+ อีก {doc.items.length - 2} รายการ</Text>
        ) : null}
      </View>

      <View style={{ height: 1, backgroundColor: "#f0f0f0", marginVertical: 12 }} />

      {/* Total */}
      <View style={{ flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12.5, color: TEXT_MUTED }}>ยอดรวม</Text>
        <Text style={{ fontSize: 20, fontWeight: "700", color: BRAND_GREEN }}>฿{doc.totalAmount.toLocaleString()}</Text>
      </View>
    </Pressable>
  );
}

export function B2BDocsScreen() {
  const nav = useNavigation<Nav>();
  const { kind } = useRoute<DocsRoute>().params;
  const [tab, setTab] = useState<string>("all");

  // The buyer's own RFQs, and the POs their accepted quotes issued.
  const ownQuotes = useBuyerQuotes();
  const ownPos = useBuyerPurchaseOrders();
  const docs = docsForKind(kind, { quotes: ownQuotes as unknown as QuoteRecord[], pos: ownPos });
  const list = tab === "all" ? docs : docs.filter((d) => (d as any).status === tab);
  const countFor = (k: string) => (k === "all" ? docs.length : docs.filter((d) => (d as any).status === k).length);

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title={DOC_TITLE[kind]}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
        bottomSlot={<FilterChips tabs={DOC_TABS[kind]} active={tab} setActive={setTab} countFor={countFor} />}
      />
      <View style={{ flex: 1 }}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 14 }}>
          {list.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 70 }}>
              <FileText size={56} color="#d4d4d4" strokeWidth={1.5} />
              <Text style={{ fontSize: 14, color: TEXT_MUTED, marginTop: 12 }}>ไม่พบเอกสารในหมวดนี้</Text>
            </View>
          ) : (
            list.map((doc) => (
              <DocCard key={doc.id} kind={kind} doc={doc} onPress={() => nav.navigate("B2BDocDetail", { kind, id: doc.id })} />
            ))
          )}
        </ScrollView>
        <LinearGradient pointerEvents="none" colors={["#fafafa", "rgba(250,250,250,0)"]} style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }} />
        <BottomFade />
      </View>
    </View>
  );
}
