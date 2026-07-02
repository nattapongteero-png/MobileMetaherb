import { requireOptionalNativeModule } from "expo-modules-core";

// The native module (iOS only). null on web / Android / Expo Go / before rebuild.
// App code should prefer src/services/cafeLiveActivity.ts which guards every call.
export default requireOptionalNativeModule("CafeLiveActivity");
