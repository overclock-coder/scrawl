import React, { useEffect, useState } from "react";
import { BackHandler, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Inter_400Regular, Inter_700Bold, Inter_900Black } from "@expo-google-fonts/inter";
import { feed } from "./src/services/priceFeed";
import { StoreProvider } from "./src/state/store";
import { HistoryScreen } from "./src/screens/HistoryScreen";
import { Landing } from "./src/screens/Landing";
import { Leaderboard } from "./src/screens/Leaderboard";
import { PlayScreen, RoundPlan } from "./src/screens/PlayScreen";
import { ResultScreen } from "./src/screens/ResultScreen";
import { RoundScreen } from "./src/screens/RoundScreen";
import { WalletSheet } from "./src/screens/WalletSheet";
import { Tab, TabBar } from "./src/ui/Bars";
import { Header } from "./src/ui/Header";
import { Backdrop, Noise } from "./src/ui/neo";
import { C } from "./src/ui/theme";

type Overlay = { kind: "round"; plan: RoundPlan } | { kind: "result"; ids: string[] } | null;

function Shell() {
  const [landing, setLanding] = useState(true);
  const [tab, setTab] = useState<Tab>("play");
  const [overlay, setOverlay] = useState<Overlay>(null);
  const [wallet, setWallet] = useState(false);

  useEffect(() => {
    feed.start();
    return () => feed.stop();
  }, []);

  // Back: ignored mid-round (the stake is live), closes a result, then Play, then the landing page.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (landing) return false;
      if (overlay?.kind === "round") return true;
      if (overlay) return setOverlay(null), true;
      if (tab !== "play") return setTab("play"), true;
      return setLanding(true), true;
    });
    return () => sub.remove();
  }, [landing, overlay, tab]);

  if (landing) {
    return (
      <Backdrop>
        <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
          <Landing onPlay={() => { setTab("play"); setLanding(false); }} onBoard={() => { setTab("leaderboard"); setLanding(false); }} />
        </SafeAreaView>
      </Backdrop>
    );
  }

  const inRound = overlay?.kind === "round";
  const goTab = (t: Tab) => { if (!inRound) { setOverlay(null); setTab(t); } };

  return (
    <Backdrop>
      <SafeAreaView style={{ flex: 1 }} edges={["top", "bottom"]}>
        <Header onWallet={() => setWallet(true)} />
        <View style={{ flex: 1 }}>
          {overlay?.kind === "round" ? (
            <RoundScreen plan={overlay.plan} onDone={(ids) => setOverlay({ kind: "result", ids })} onAbort={() => setOverlay(null)} />
          ) : overlay?.kind === "result" ? (
            <ResultScreen ids={overlay.ids} onAgain={() => { setOverlay(null); setTab("play"); }} />
          ) : tab === "play" ? (
            <PlayScreen onStart={(plan) => setOverlay({ kind: "round", plan })} />
          ) : tab === "leaderboard" ? (
            <Leaderboard />
          ) : (
            <HistoryScreen onOpen={(id) => setOverlay({ kind: "result", ids: [id] })} onWallet={() => setWallet(true)} />
          )}
          {tab !== "play" && !overlay && <Noise opacity={0.1} />}
        </View>
        {!inRound && <TabBar tab={tab} onTab={goTab} />}
        <WalletSheet visible={wallet} onClose={() => setWallet(false)} />
      </SafeAreaView>
    </Backdrop>
  );
}

export default function App() {
  const [loaded] = useFonts({
    Venite: require("./assets/fonts/VeniteAdoremus.ttf"),
    Inter_400Regular,
    Inter_700Bold,
    Inter_900Black,
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {loaded ? (
        <StoreProvider>
          <Shell />
        </StoreProvider>
      ) : (
        <View style={{ flex: 1, backgroundColor: C.bg }} />
      )}
    </SafeAreaProvider>
  );
}
