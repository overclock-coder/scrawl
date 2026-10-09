import React, { useEffect, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { feed } from "./src/services/priceFeed";
import { StoreProvider } from "./src/state/store";
import { PlayScreen, RoundPlan } from "./src/screens/PlayScreen";
import { ResultScreen } from "./src/screens/ResultScreen";
import { RoundScreen } from "./src/screens/RoundScreen";
import { StatsScreen } from "./src/screens/StatsScreen";
import { C } from "./src/ui/theme";

type Tab = "play" | "stats";
type Overlay = { kind: "round"; plan: RoundPlan } | { kind: "result"; id: string } | null;

function Shell() {
  const [tab, setTab] = useState<Tab>("play");
  const [overlay, setOverlay] = useState<Overlay>(null);

  useEffect(() => {
    feed.start();
    return () => feed.stop();
  }, []);

  // Back closes a result, is ignored mid-round (the stake is live), and otherwise returns to Play.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (overlay?.kind === "round") return true;
      if (overlay) {
        setOverlay(null);
        return true;
      }
      if (tab !== "play") {
        setTab("play");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [overlay, tab]);

  return (
    <SafeAreaView style={s.root} edges={["top", "bottom"]}>
      <StatusBar style="light" />
      <View style={s.body}>
        {overlay?.kind === "round" ? (
          <RoundScreen
            plan={overlay.plan}
            onDone={(id) => setOverlay({ kind: "result", id })}
            onAbort={() => setOverlay(null)}
          />
        ) : overlay?.kind === "result" ? (
          <ResultScreen id={overlay.id} onAgain={() => { setOverlay(null); setTab("play"); }} />
        ) : tab === "play" ? (
          <PlayScreen onStart={(plan) => setOverlay({ kind: "round", plan })} />
        ) : (
          <StatsScreen onOpen={(id) => setOverlay({ kind: "result", id })} />
        )}
      </View>
      {overlay?.kind !== "round" && (
        <View style={s.tabs}>
          {(["play", "stats"] as Tab[]).map((t) => (
            <Pressable key={t} style={s.tab} onPress={() => { setOverlay(null); setTab(t); }}>
              <Text style={[s.tabText, tab === t && !overlay && { color: C.accent }]}>{t === "play" ? "Draw" : "Record"}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StoreProvider>
        <Shell />
      </StoreProvider>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  body: { flex: 1 },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderTopColor: C.line, backgroundColor: C.bg },
  tab: { flex: 1, alignItems: "center", paddingVertical: 16 },
  tabText: { color: C.dim, fontWeight: "800" },
});
