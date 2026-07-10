import { defineConfig, type Plugin } from "vitest/config";
import path from "node:path";

/**
 * Metro turns `require("…/photo.png")` into an opaque numeric asset handle.
 * Nothing in src/store dereferences it, so replace those calls with a literal
 * and the real seed files load in Node.
 */
const ASSET = /require\((['"])[^'"]+\.(png|jpg|jpeg|gif|webp|svg)\1\)/g;
function stubAssetRequires(): Plugin {
  return {
    name: "stub-asset-requires",
    enforce: "pre",
    transform(code, id) {
      if (!id.endsWith(".ts") && !id.endsWith(".tsx")) return null;
      if (!ASSET.test(code)) return null;
      ASSET.lastIndex = 0;
      return { code: code.replace(ASSET, "1"), map: null };
    },
  };
}

/**
 * Two suites:
 *   src/store/**.test.ts   pure domain logic — no react-native, no assets
 *   test/**.test.ts        boot integration: imports the real seed files, so
 *                          image require() and AsyncStorage need stand-ins
 */
export default defineConfig({
  plugins: [stubAssetRequires()],
  test: {
    environment: "node",
    include: ["src/store/**/*.test.ts", "test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@react-native-async-storage/async-storage": path.resolve(__dirname, "test/stubs/asyncStorage.ts"),
      "lucide-react-native": path.resolve(__dirname, "test/stubs/lucide.ts"),
    },
  },
});
