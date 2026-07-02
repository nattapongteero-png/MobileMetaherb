/**
 * SearchBar — shared owner-console search field. Ported from the ทะเบียนสินค้าทดลอง
 * (TrialRegistryView) style: white pill + hairline border + green round search icon.
 * Reused across สินค้าทดลอง, โปรโมชั่น, คูปอง.
 */
import { View, TextInput } from "react-native";
import { Search } from "lucide-react-native";
import { BRAND_GREEN, DIVIDER_GRAY, TEXT_PRIMARY, TEXT_DISABLED } from "../theme/tokens";

export function SearchBar({
  value,
  onChangeText,
  placeholder = "ค้นหา...",
}: {
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
}) {
  return (
    <View
      className="flex-row items-center"
      style={{
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: DIVIDER_GRAY,
        borderRadius: 999,
        height: 44,
        paddingLeft: 16,
        paddingRight: 6,
        gap: 8,
      }}
    >
      <TextInput
        style={{ flex: 1, fontSize: 13, color: TEXT_PRIMARY, padding: 0 }}
        placeholder={placeholder}
        placeholderTextColor={TEXT_DISABLED}
        value={value}
        onChangeText={onChangeText}
      />
      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: BRAND_GREEN, alignItems: "center", justifyContent: "center" }}>
        <Search size={16} color="white" />
      </View>
    </View>
  );
}
