import { View, Image, Text } from "react-native";
import { getShop } from "../data/shops";

/** Round shop avatar — real logo for shops that have one, otherwise the shop's
 *  initial on its brand tint. Keeps shop identity consistent across screens. */
export function ShopAvatar({ name, size = 52 }: { name?: string; size?: number }) {
  const shop = getShop(name);
  const contain = shop.avatarFit === "contain";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        overflow: "hidden",
        backgroundColor: shop.avatar ? "#f3f4f6" : shop.tint,
        alignItems: "center",
        justifyContent: "center",
        padding: contain ? Math.round(size * 0.16) : 0,
      }}
    >
      {shop.avatar ? (
        <Image
          source={shop.avatar}
          style={{ width: "100%", height: "100%" }}
          resizeMode={shop.avatarFit ?? "cover"}
        />
      ) : (
        <Text style={{ fontSize: Math.round(size * 0.42), fontWeight: "700", color: "#fff" }}>
          {shop.name.charAt(0)}
        </Text>
      )}
    </View>
  );
}
