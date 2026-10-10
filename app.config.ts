import type { ExpoConfig } from "expo/config";

const config: ExpoConfig = {
  name: "Scrawl",
  slug: "scrawl",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/icon.png",
  userInterfaceStyle: "dark",
  backgroundColor: "#0a0014",
  android: {
    package: "app.scrawl.mobile",
    versionCode: 1,
    adaptiveIcon: {
      backgroundColor: "#0B0721",
      foregroundImage: "./assets/android-icon-foreground.png",
    },
    predictiveBackGestureEnabled: false,
    permissions: ["VIBRATE"],
  },
  plugins: [
    "expo-secure-store",
    "expo-dev-client",
    ["expo-splash-screen", { image: "./assets/splash-icon.png", imageWidth: 240, backgroundColor: "#0B0721" }],
    ["expo-build-properties", { android: { usesCleartextTraffic: false } }],
    "./plugins/withReleaseSigning",
  ],
};

export default config;
