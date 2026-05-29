import type { ReactNode } from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { useNavigation } from "@react-navigation/native";
import { IconButton } from "./IconButton";
import { TEXT_PRIMARY, TEXT_MUTED } from "../theme/tokens";

type Props = {
  /** Main title shown in the row. */
  title: string;
  /** Optional subtitle rendered after the title in muted style — e.g. an item count "(3 ยังไม่อ่าน)". */
  subtitle?: string;
  /** Optional element rendered on the right side of the row (e.g. an action button). */
  rightSlot?: ReactNode;
  /** Override default `nav.goBack()` if needed. */
  onBack?: () => void;
};

/**
 * Sub-screen sticky header used by Cart / Payment / Notification. White
 * background, 38px round back button, 17/600 title + optional inline
 * subtitle. Right slot accommodates per-screen actions like "อ่านทั้งหมด".
 */
export function PageHeader({ title, subtitle, rightSlot, onBack }: Props) {
  const nav = useNavigation();

  const handleBack = () => {
    if (onBack) onBack();
    else if (nav.canGoBack()) nav.goBack();
  };

  return (
    <SafeAreaView edges={["top"]} className="bg-white border-b border-gray-200">
      <View
        className="flex-row items-center"
        style={{ paddingHorizontal: 12, paddingVertical: 10, gap: 8 }}
      >
        <IconButton onPress={handleBack} accessibilityLabel="ย้อนกลับ">
          <ChevronLeft size={22} color={TEXT_PRIMARY} />
        </IconButton>

        <Text
          numberOfLines={1}
          style={{
            fontSize: 17,
            fontWeight: "600",
            color: TEXT_PRIMARY,
            lineHeight: 22,
            flex: 1,
          }}
        >
          {title}
          {subtitle ? (
            <Text style={{ fontSize: 13, fontWeight: "400", color: TEXT_MUTED }}>
              {"  "}{subtitle}
            </Text>
          ) : null}
        </Text>

        {rightSlot}
      </View>
    </SafeAreaView>
  );
}
