import { useEffect, useRef, useState } from "react";
import { View, Text, Image, Pressable, Animated, Dimensions, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Eye, ChevronRight, Play } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SubPageHeader } from "../components/SubPageHeader";
import { BottomFade } from "../components/BottomFade";
import { ARTICLES, VIDEOS, type Article, type VideoItem } from "../data/articles";
import { BRAND_GREEN, TEXT_SECONDARY } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";
import { appWidth, gridColumns, gridCardWidth, isTablet } from "../theme/layout";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Tab = "articles" | "videos";

const ACCENT = "#af6f08"; // amber accent from the web blog

const SCREEN_WIDTH =
  appWidth();

// Responsive grid — 2 columns on phones, more on tablets (flex-wrap fills rows).
const VIDEO_WIDTH = gridCardWidth(gridColumns(190, 32, 12), 32, 12);
const VIDEO_HEIGHT = Math.round((VIDEO_WIDTH * 5) / 4); // 4:5 portrait
// Article cards — 2-per-row on tablets.
const ARTICLE_CARD_WIDTH = gridCardWidth(2, 32, 12);

function Pill({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={[
        { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function ArticleCard({ a, onPress }: { a: Article; onPress: () => void }) {
  // iPad — taller card + bigger cover (same treatment as the Home article rail).
  const tablet = isTablet();
  return (
    <Pressable
      onPress={onPress}
      className="active:opacity-90"
      style={{
        flexDirection: "row",
        height: tablet ? 200 : 132,
        backgroundColor: "#ffffff",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#d4d4d4",
        overflow: "hidden",
      }}
    >
      {/* Image left with view + date overlays */}
      <View style={{ width: tablet ? 175 : 130 }}>
        <Image source={{ uri: a.image }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
        <View style={{ flex: 1, justifyContent: "space-between", padding: 8 }}>
          <Pill style={{ alignSelf: "flex-start" }}>
            <Eye size={11} color="#fff" />
            <Text style={{ fontSize: 10, color: "#fff" }}>{a.views.toLocaleString()}</Text>
          </Pill>
          <Pill style={{ alignSelf: "flex-start" }}>
            <Text style={{ fontSize: 10, color: "#fff" }}>{a.date}</Text>
          </Pill>
        </View>
      </View>

      {/* Content right (no category) — vertically centered, 10px spacing */}
      <View style={{ flex: 1, paddingHorizontal: 14, paddingVertical: tablet ? 14 : 12 }}>
        <Text style={{ fontSize: tablet ? 15 : 14, fontWeight: "600", color: "#0a0a0a", lineHeight: tablet ? 21 : 19 }} numberOfLines={tablet ? 2 : 1}>
          {a.title}
        </Text>
        <Text style={{ fontSize: tablet ? 12.5 : 12, color: TEXT_SECONDARY, lineHeight: tablet ? 18 : 17, marginTop: 4 }} numberOfLines={tablet ? 3 : 2}>
          {a.desc}
        </Text>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            alignSelf: "flex-start",
            marginTop: "auto",
            backgroundColor: "rgba(175,111,8,0.1)",
            paddingHorizontal: 10,
            paddingVertical: 5,
            borderRadius: 999,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: ACCENT }}>อ่านเพิ่มเติม</Text>
          <ChevronRight size={13} color={ACCENT} strokeWidth={2.4} />
        </View>
      </View>
    </Pressable>
  );
}

function VideoCard({ v }: { v: VideoItem }) {
  return (
    <Pressable className="active:opacity-90" style={{ width: VIDEO_WIDTH, height: VIDEO_HEIGHT, borderRadius: 16, overflow: "hidden" }}>
      <Image source={{ uri: v.image }} style={{ position: "absolute", width: "100%", height: "100%" }} resizeMode="cover" />
      <View style={{ flex: 1, justifyContent: "space-between", padding: 10 }}>
        <Pill style={{ alignSelf: "flex-start" }}>
          <Eye size={12} color="#fff" />
          <Text style={{ fontSize: 11, color: "#fff" }}>{v.views}</Text>
        </Pill>
        <View style={{ backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
          <Text style={{ fontSize: 11, color: "#fff", textAlign: "center" }} numberOfLines={1}>
            {v.title}
          </Text>
        </View>
      </View>
      <View style={{ position: "absolute", top: 0, bottom: 0, left: 0, right: 0, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center" }}>
          <Play size={20} color="#fff" fill="#fff" />
        </View>
      </View>
    </Pressable>
  );
}

/** Capsule (วงรี) tab switcher with a white pill that slides between tabs. */
function AnimatedTabs({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) {
  const pos = useRef(new Animated.Value(tab === "videos" ? 1 : 0)).current;
  // Measure the track so the sliding pill matches the real width (independent
  // of the header's horizontal padding).
  const [segW, setSegW] = useState(0);

  useEffect(() => {
    Animated.spring(pos, {
      toValue: tab === "videos" ? 1 : 0,
      useNativeDriver: true,
      friction: 9,
      tension: 90,
    }).start();
  }, [tab, pos]);

  const translateX = pos.interpolate({ inputRange: [0, 1], outputRange: [0, segW] });

  const seg = (key: Tab, label: string) => (
    <Pressable
      key={key}
      onPress={() => onChange(key)}
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Text style={{ fontSize: 14, fontWeight: tab === key ? "700" : "600", color: tab === key ? "#ffffff" : "#6b7280" }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View
      onLayout={(e) => setSegW((e.nativeEvent.layout.width - 8) / 2)}
      style={{
        height: 44,
        borderRadius: 999,
        backgroundColor: "#ffffff",
        padding: 4,
        shadowColor: "#0a3d22",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 5,
        elevation: 2,
      }}
    >
      {/* Sliding pill — width/offset derived from the measured track */}
      {segW > 0 ? (
        <Animated.View
          style={{
            position: "absolute",
            top: 4,
            left: 4,
            width: segW,
            height: 36,
            borderRadius: 999,
            backgroundColor: BRAND_GREEN,
            transform: [{ translateX }],
            shadowColor: "#000",
            shadowOpacity: 0.12,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 },
          }}
        />
      ) : null}
      <View style={{ flex: 1, flexDirection: "row" }}>
        {seg("articles", "บทความ")}
        {seg("videos", "วิดีโอ")}
      </View>
    </View>
  );
}

export function KnowledgeScreen() {
  const nav = useNavigation<Nav>();
  const route = useRoute();
  const initialTab = (route.params as { tab?: Tab } | undefined)?.tab ?? "articles";
  const scrollY = useRef(new Animated.Value(0)).current;
  const [tab, setTab] = useState<Tab>(initialTab);

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <SubPageHeader
        title="สาระความรู้"
        subtitle="บทความ & วิดีโอสมุนไพร"
        showSearch={false}
        onBack={() => nav.canGoBack() && nav.goBack()}
        onCart={() => nav.navigate("Cart")}
        bottomSlot={<AnimatedTabs tab={tab} onChange={setTab} />}
      />

      <View style={{ flex: 1 }}>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: 16, paddingBottom: 110 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
        >
          {tab === "articles" ? (
            // Phones: single column. iPad: 2-per-row wrap grid.
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {ARTICLES.map((a) => (
                <View key={a.id} style={{ width: isTablet() ? ARTICLE_CARD_WIDTH : "100%" }}>
                  <ArticleCard a={a} onPress={() => nav.navigate("ArticleDetail", { article: a })} />
                </View>
              ))}
            </View>
          ) : (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
              {VIDEOS.map((v) => (
                <VideoCard key={v.id} v={v} />
              ))}
            </View>
          )}
        </Animated.ScrollView>

        {/* Top fade — content dissolves into the header as it scrolls up */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
        {/* Black scroll-edge shade at the very bottom of the screen. */}
        <BottomFade />
      </View>
    </View>
  );
}
