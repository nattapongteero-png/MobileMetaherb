import { View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { SubPageHeader } from "../components/SubPageHeader";
import { BottomFade } from "../components/BottomFade";
import { EvalSummary } from "./trialDetail/TrialDetailApplicants";
import type { RootStackParamList } from "../navigation/RootStack";

type Nav = NativeStackNavigationProp<RootStackParamList>;

/** คำตอบแบบประเมินจากผู้ทดสอบ — full-page answer replay (pushed, not a sheet),
 *  reusing the EvalSummary content the sheet used to show. */
export function OwnerTrialEvalAnswersScreen() {
  const nav = useNavigation<Nav>();
  const { reg, product } = useRoute<RouteProp<RootStackParamList, "OwnerTrialEvalAnswers">>().params;

  return (
    <View className="flex-1" style={{ backgroundColor: "#fafafa" }}>
      <StatusBar style="dark" />
      <SubPageHeader
        title="แบบประเมินจากผู้ทดสอบ"
        subtitle={reg.name || "ผู้สมัคร"}
        onBack={() => nav.canGoBack() && nav.goBack()}
        showSearch={false}
      />
      <View style={{ flex: 1 }}>
        <EvalSummary reg={reg} product={product} />
        {/* Scroll fades — content dissolves into the header / bottom edge */}
        <LinearGradient
          pointerEvents="none"
          colors={["#fafafa", "rgba(250,250,250,0)"]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, height: 28 }}
        />
        <BottomFade />
      </View>
    </View>
  );
}
