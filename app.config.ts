import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Scrawl",
  slug: "scrawl",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  backgroundColor: "#0B0B10",
  android: {
    package: "app.scrawl.mobile",
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: "#0B0B10",
      foregroundImage: "./assets/android-icon-foreground.png",
      monochromeImage: "./assets/android-icon-monochrome.png",
    },
    predictiveBackGestureEnabled: false,
    permissions: ["VIBRATE"],
  },
  plugins: [
    "expo-secure-store",
    "expo-dev-client",
    ["expo-build-properties", { android: { usesCleartextTraffic: false } }],
    "./plugins/withReleaseSigning",
  ],
};

export default config;
