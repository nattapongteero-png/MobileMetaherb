import { Fragment, useRef } from "react";
import { View, Text, Image, ScrollView, Share, Animated, Dimensions, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ChevronLeft, Eye, Share2, Calendar } from "lucide-react-native";
import { IconButton } from "../components/IconButton";
import { BRAND_GREEN, TEXT_SECONDARY } from "../theme/tokens";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type DetailRoute = RouteProp<RootStackParamList, "ArticleDetail">;

const SCREEN_WIDTH =
  Platform.OS === "web" ? Math.min(Dimensions.get("window").width, 430) : Dimensions.get("window").width;
const COVER_H = Math.round(SCREEN_WIDTH * 0.64);

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
  const { article } = useRoute<DetailRoute>().params;

  // Sticky header fades from transparent (over the cover) to solid green once
  // the user scrolls past the cover — same behaviour as ProductDetailScreen.
  const scrollY = useRef(new Animated.Value(0)).current;
  const FADE_START = COVER_H * 0.5;
  const FADE_END = COVER_H * 0.92;
  const headerBg = scrollY.interpolate({
    inputRange: [FADE_START, FADE_END],
    outputRange: ["rgba(49,151,84,0)", "rgba(49,151,84,1)"],
    extrapolate: "clamp",
  });
  const headerTitleOpacity = scrollY.interpolate({
    inputRange: [FADE_END - 30, FADE_END],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });
  const headerBorderOpacity = scrollY.interpolate({
    inputRange: [FADE_END - 10, FADE_END + 10],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const onShare = () => {
    Share.share({ message: `${article.title}\n\nอ่านสาระความรู้สมุนไพรจาก METAHERB` }).catch(() => {});
  };

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="light" />

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 48 }}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      >
        {/* Full-bleed cover */}
        <View style={{ width: SCREEN_WIDTH, height: COVER_H, backgroundColor: "#e5e5e5" }}>
          <Image source={{ uri: article.image }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
          {/* Top scrim so the status bar + header icons stay legible on any photo */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0.4)", "rgba(0,0,0,0)"]}
            style={{ position: "absolute", top: 0, left: 0, right: 0, height: 140 }}
          />
        </View>

        {/* Content sheet — rounded top rises over the cover */}
        <View
          style={{
            backgroundColor: "#fafafa",
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            marginTop: -20,
            paddingHorizontal: 16,
            paddingTop: 20,
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

      {/* Sticky header — transparent over the cover, fades to solid green on scroll */}
      <Animated.View
        pointerEvents="box-none"
        style={{ position: "absolute", top: 0, left: 0, right: 0, backgroundColor: headerBg }}
      >
        <SafeAreaView edges={["top"]} pointerEvents="box-none">
          <View
            className="flex-row items-center"
            style={{ paddingHorizontal: 12, paddingTop: 8, paddingBottom: 8, gap: 8 }}
            pointerEvents="box-none"
          >
            <IconButton onPress={() => nav.canGoBack() && nav.goBack()} variant="translucentDark" accessibilityLabel="ย้อนกลับ">
              <ChevronLeft size={22} color="white" />
            </IconButton>

            <Animated.Text
              numberOfLines={1}
              style={{ flex: 1, opacity: headerTitleOpacity, color: "white", fontSize: 15, fontWeight: "600", lineHeight: 20 }}
            >
              {article.title}
            </Animated.Text>

            <IconButton onPress={onShare} variant="translucentDark" accessibilityLabel="แชร์บทความ">
              <Share2 size={20} color="white" />
            </IconButton>
          </View>
        </SafeAreaView>
        <Animated.View style={{ height: 1, backgroundColor: "rgba(0,0,0,0.08)", opacity: headerBorderOpacity }} />
      </Animated.View>
    </View>
  );
}
