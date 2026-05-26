import "./src/styles/global.css";
import { Platform, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { RootStack } from "./src/navigation/RootStack";

const MOBILE_MAX_WIDTH = 430;

export default function App() {
  const tree = (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <RootStack />
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );

  if (Platform.OS === "web") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          backgroundColor: "#1f2937",
        }}
      >
        <View
          style={{
            width: "100%",
            maxWidth: MOBILE_MAX_WIDTH,
            height: "100%",
            backgroundColor: "#fafafa",
            overflow: "hidden",
            boxShadow: "0 4px 24px rgba(0,0,0,0.25)",
          }}
        >
          {tree}
        </View>
      </View>
    );
  }

  return tree;
}
