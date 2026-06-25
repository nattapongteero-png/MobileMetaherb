import { View, Image } from "react-native";

const A = require("../../assets/herb-leaf-a.png");
const B = require("../../assets/herb-leaf-b.png");
const C = require("../../assets/herb-leaf-c.png");
const D = require("../../assets/herb-leaf-d.png");

/** Faint scattered herb leaves framing the screen corners (decorative watermark). */
export function LeafDecor() {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, overflow: "hidden" }}>
      <Image source={D} resizeMode="contain" style={{ position: "absolute", top: 24, right: -14, width: 132, height: 132, opacity: 0.34, transform: [{ rotate: "26deg" }] }} />
      <Image source={A} resizeMode="contain" style={{ position: "absolute", top: 96, left: -18, width: 104, height: 104, opacity: 0.28, transform: [{ rotate: "-24deg" }] }} />
      <Image source={C} resizeMode="contain" style={{ position: "absolute", bottom: 30, left: -22, width: 142, height: 142, opacity: 0.36, transform: [{ rotate: "62deg" }] }} />
      <Image source={B} resizeMode="contain" style={{ position: "absolute", bottom: 36, right: -12, width: 100, height: 100, opacity: 0.32, transform: [{ rotate: "122deg" }] }} />
    </View>
  );
}
