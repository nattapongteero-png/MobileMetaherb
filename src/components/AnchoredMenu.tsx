import { useRef, useState, type ReactNode } from "react";
import { View, Pressable, Modal, StyleSheet, Dimensions } from "react-native";

export type Anchor = { x: number; width: number; top?: number; bottom?: number };

/**
 * Drives a floating pull-down menu anchored to a trigger element (Apple-style,
 * like the product-filter selects). Put `ref` on the trigger; call `openMenu`
 * to measure it and open. The menu opens upward when the trigger sits low on
 * screen so it never falls off the bottom edge.
 */
export function useAnchoredMenu() {
  const ref = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor>({ x: 0, width: 0, top: 0 });

  const openMenu = () => {
    ref.current?.measureInWindow((x, y, w, h) => {
      const wh = Dimensions.get("window").height;
      if (y > wh * 0.55) setAnchor({ x, width: w, bottom: wh - y + 6 });
      else setAnchor({ x, width: w, top: y + h + 6 });
      setOpen(true);
    });
  };

  return { ref, open, setOpen, anchor, openMenu };
}

/** Floating popover card rendered over content; tap outside to dismiss. */
export function AnchoredMenu({
  open,
  onClose,
  anchor,
  children,
}: {
  open: boolean;
  onClose: () => void;
  anchor: Anchor;
  children: ReactNode;
}) {
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <Pressable style={{ flex: 1 }} onPress={onClose}>
        <View
          style={[
            styles.shadow,
            { position: "absolute", left: anchor.x, width: anchor.width, top: anchor.top, bottom: anchor.bottom },
          ]}
        >
          <View style={styles.card}>{children}</View>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Matches the product-filter popover shadow + radius.
  shadow: {
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 14,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.06)",
    overflow: "hidden",
  },
});
