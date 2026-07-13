import { registerRootComponent } from 'expo';
import { LogBox } from 'react-native';

import App from './App';

// Known no-op warning under the New Architecture (fired by the tab layout
// animation) — its LogBox toast permanently covers the tab bar in dev.
LogBox.ignoreLogs(['setLayoutAnimationEnabledExperimental is currently a no-op']);

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
