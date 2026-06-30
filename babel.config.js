module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    // Reanimated 4 runs its worklets through react-native-worklets; its Babel
    // plugin must be listed LAST. Without it the app crashes at startup with
    // "NativeWorklets ... Exception in HostFunction".
    plugins: ["react-native-worklets/plugin"],
  };
};
