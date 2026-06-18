import { Fragment, useRef } from "react";
import { View, Text, Image, Animated, Share, Dimensions, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Eye, Share2, Calendar } from "lucide-react-native";
import { GlassIconButton } from "../components/GlassIconButton";
import { BRAND_GREEN, TEXT_SECONDARY } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, "ArticleDetail">;

const SCREEN_WIDTH =
  Platform.OS === "web" ? Math.min(Dimensions.get("window").width, 430) : Dimensions.get("window").width;
// Square hero — same height as the product detail page.
const COVER_H = SCREEN_WIDTH;

const TEXT = "#1a1a1a";

/**
 * Renders the article body from the same lightweight markdown the website uses:
 *   **heading**            → section heading
 *   1. **label:** text     → numbered item with bold label
 *   * **label:** text      → bullet with bold label
 *   * text                 → bullet
 *   (blank line)           → spacer
 *   anything else          → paragraph
 */
function ArticleBody({ content }: { content: string }) {
  return (
    <View style={{ gap: 9 }}>
      {content.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return <View key={i} style={{ height: 3 }} />;

        if (t.startsWith("**") && t.endsWith("**")) {
          return (
            <Text key={i} style={{ fontSize: 16, fontWeight: "700", color: TEXT, marginTop: 6 }}>
              {t.replace(/\*\*/g, "")}
            </Text>
          );
        }

        if (t.startsWith("* **")) {
          const [label, ...rest] = t.replace("* **", "").split(":**");
          return (
            <Text key={i} style={{ fontSize: 14, color: TEXT, lineHeight: 23, paddingLeft: 12 }}>
              {"•  "}
              <Text style={{ fontWeight: "700" }}>{label}:</Text>
              {rest.join(":**")}
            </Text>
          );
        }

        if (t.startsWith("* ")) {
          return (
            <Text key={i} style={{ fontSize: 14, color: TEXT, lineHeight: 23, paddingLeft: 12 }}>
              {"•  "}
              {t.slice(2)}
            </Text>
          );
        }

        const numMatch = t.match(/^(\d+)\.\s*(.*)$/);
        if (numMatch) {
          const boldMatch = numMatch[2].match(/^\*\*(.+?):\*\*\s*(.*)$/);
          return (
            <Text key={i} style={{ fontSize: 14, color: TEXT, lineHeight: 23, paddingLeft: 12 }}>
              <Text style={{ fontWeight: "700" }}>{numMatch[1]}. </Text>
              {boldMatch ? (
                <Fragment>
                  <Text style={{ fontWeight: "700" }}>{boldMatch[1]}:</Text> {boldMatch[2]}
                </Fragment>
              ) : (
                numMatch[2].replace(/\*\*/g, "")
              )}
            </Text>
          );
        }

        return (
          <Text key={i} style={{ fontSize: 14, color: TEXT, lineHeight: 23 }}>
            {t.replace(/\*\*/g, "")}
          </Text>
        );
      })}
    </View>
  );
}

export function ArticleDetailScreen() {
  const nav = useNavigation<Nav>();
  const insets = useSafeAreaInsets();
  const { article } = useRoute<DetailRoute>().params;

  // Stretchy hero + app-bar fade, mirroring ProductDetailScreen.
  const scrollY = useRef(new Animated.Value(0)).current;
  const heroScale = scrollY.interpolate({
    inputRange: [-COVER_H, 0],
    outputRange: [2, 1],
    extrapolateLeft: "extend",
    extrapolateRight: "clamp",
  });
  const heroTranslateY = scrollY.interpolate({
    inputRange: [-COVER_H, 0],
    outputRange: [-COVER_H / 2, 0],
    extrapolateLeft: "extend",
    extrapolateRight: "clamp",
  });
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [COVER_H * 0.45, COVER_H * 0.75],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const headerScrimOpacity = scrollY.interpolate({
    inputRange: [0, COVER_H * 0.6],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const onShare = () => {
    Share.share({ message: `${article.title}\n\nอ่านสาระความรู้สมุนไพรจาก METAHERB` }).catch(() => {});
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Stretchy hero — zooms on pull-down (iOS), like the product page */}
        <Animated.View
          style={{
            width: SCREEN_WIDTH,
            height: COVER_H,
            backgroundColor: "#e5e5e5",
            transform: [{ translateY: heroTranslateY }, { scale: heroScale }],
          }}
        >
          <Image source={{ uri: article.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        </Animated.View>

        {/* Content — flat, square edges (no rounded corners over the cover) */}
        <View
          style={{
            backgroundColor: "#fafafa",
            paddingHorizontal: 16,
            paddingTop: 18,
            paddingBottom: 28,
            gap: 16,
          }}
        >
          {/* Title + meta */}
          <View style={{ gap: 10 }}>
            <Text style={{ fontSize: 22, fontWeight: "700", color: "#0a0a0a", lineHeight: 31 }}>{article.title}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Calendar size={13} color={TEXT_SECONDARY} strokeWidth={2.2} />
                <Text style={{ fontSize: 12, color: TEXT_SECONDARY }}>{article.date}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                <Eye size={13} color={TEXT_SECONDARY} strokeWidth={2.2} />
                <Text style={{ fontSize: 12, color: TEXT_SECONDARY }}>{article.views.toLocaleString()}</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: "#e5e5e5" }} />

          {/* Body */}
          <ArticleBody content={article.content} />
        </View>
      </Animated.ScrollView>

      {/* Dark scrim over the hero — keeps glass buttons legible; fades on scroll */}
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 64, opacity: headerScrimOpacity }}
      >
        <LinearGradient colors={["rgba(0,0,0,0.45)", "rgba(0,0,0,0)"]} style={{ flex: 1 }} />
      </Animated.View>

      {/* App-bar — white→transparent gradient eases in as the hero scrolls past */}
      <Animated.View
        pointerEvents="none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top + 72, opacity: headerBgOpacity }}
      >
        <LinearGradient colors={["#ffffff", "rgba(255,255,255,0)"]} style={{ flex: 1 }} />
      </Animated.View>

      {/* Floating Liquid Glass controls over the cover (App Store style) */}
      <SafeAreaView edges={["top"]} pointerEvents="box-none" style={{ position: "absolute", top: 0, left: 0, right: 0 }}>
        <View
          className="flex-row items-center justify-between"
          style={{ paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8 }}
          pointerEvents="box-none"
        >
          <GlassIconButton onPress={() => nav.canGoBack() && nav.goBack()} accessibilityLabel="ย้อนกลับ">
            <ChevronLeft size={24} color="#1a1a1a" strokeWidth={2.4} />
          </GlassIconButton>
          <GlassIconButton onPress={onShare} accessibilityLabel="แชร์บทความ">
            <Share2 size={20} color="#1a1a1a" />
          </GlassIconButton>
        </View>
      </SafeAreaView>
    </View>
  );
}
