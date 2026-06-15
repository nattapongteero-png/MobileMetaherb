import { Component, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

/**
 * Catches render-time JS errors and shows the message on screen instead of a
 * blank white screen — used to diagnose Release builds where Metro logs aren't
 * available.
 */
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <ScrollView contentContainerStyle={{ padding: 24, paddingTop: 90 }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#ef4444", marginBottom: 12 }}>เกิดข้อผิดพลาด (debug)</Text>
            <Text selectable style={{ fontSize: 14, color: "#0a0a0a", marginBottom: 14 }}>{error.message}</Text>
            <Text selectable style={{ fontSize: 11, color: "#737373" }}>{error.stack}</Text>
          </ScrollView>
        </View>
      );
    }
    return this.props.children as ReactNode;
  }
}
