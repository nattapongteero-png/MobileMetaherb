import type { ReactNode } from "react";
import { View, Text } from "react-native";
import {
  SURFACE_GRAY,
  TEXT_DISABLED,
  TEXT_SECONDARY,
} from "../theme/tokens";

type Props = {
  /** lucide-react-native icon element, sized to ~36px. */
  icon: ReactNode;
  /** Primary message. */
  title: string;
  /** Optional secondary message. */
  subtitle?: string;
  /** Optional action element (e.g. a CTA button). */
  action?: ReactNode;
  /** Size of the icon's circular background. Default 80. */
  iconBgSize?: number;
};

/**
 * Empty / zero-state for lists (cart, notifications, search results, etc.).
 * Centered round icon + title + subtitle + optional action — same proportions
 * across surfaces so users learn the "nothing here" affordance once.
 */
export function EmptyState({
  icon,
  title,
  subtitle,
  action,
  iconBgSize = 80,
}: Props) {
  return (
    <View style={{ alignItems: "center", paddingVertical: 64, paddingHorizontal: 32 }}>
      <View
        style={{
          width: iconBgSize,
          height: iconBgSize,
          borderRadius: iconBgSize / 2,
          backgroundColor: SURFACE_GRAY,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </View>
      <Text
        style={{
          marginTop: 16,
          fontSize: 15,
          fontWeight: "600",
          color: TEXT_SECONDARY,
        }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            marginTop: 6,
            fontSize: 13,
            color: TEXT_DISABLED,
            textAlign: "center",
            lineHeight: 18,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
      {action ? <View style={{ marginTop: 16 }}>{action}</View> : null}
    </View>
  );
}
