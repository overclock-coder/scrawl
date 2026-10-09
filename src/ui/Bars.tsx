import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { C, F, fade } from "./theme";
import { NeoBox } from "./neo";
import { money } from "./hooks";

export type Tab = "play" | "leaderboard" | "history";

function Square({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={() => { Haptics.selectionAsync().catch(() => {}); onPress(); }}>
      <NeoBox bg={C.bg} border={C.lime} borderWidth={2} radius={8} shadow={3} shadowColor={C.lime} innerStyle={{ width: 34, height: 34, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 18 }}>{label}</Text>
      </NeoBox>
    </Pressable>
  );
}

function Pill({ icon, text, color }: { icon: number; text: string; color: string }) {
  return (
    <NeoBox bg={fade(C.purple, 0.5)} border={C.lime} borderWidth={2} radius={8} shadow={3} shadowColor={C.lime} style={{ flexShrink: 1 }} innerStyle={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 6, paddingVertical: 2 }}>
      <Image source={icon} style={{ width: 28, height: 28 }} resizeMode="contain" />
      <Text numberOfLines={1} style={{ color, fontFamily: F.mono, fontSize: 11 }}>{text}</Text>
    </NeoBox>
  );
}

/** The web page's fixed bottom bar: zoom, wallet pill, profit pill, status and clear. */
export function BottomControls({
  onZoomIn, onZoomOut, balance, balanceText, pnl, minutes, hasPoints, onClear,
}: { onZoomIn: () => void; onZoomOut: () => void; balance: number; balanceText?: string; pnl: number | null; minutes: number | null; hasPoints: boolean; onClear: () => void }) {
  const pnlColor = pnl === null ? C.lime : pnl >= 0 ? "#6EE7B7" : "#FCA5A5";
  return (
    <View style={{ backgroundColor: fade(C.purple, 0.96), borderTopWidth: 4, borderTopColor: C.lime, paddingHorizontal: 8, paddingVertical: 8, flexDirection: "row", alignItems: "center", gap: 6 }}>
      <View style={{ flexDirection: "row", gap: 6 }}>
        <Square label="−" onPress={onZoomOut} />
        <Square label="+" onPress={onZoomIn} />
      </View>
      <View style={{ flex: 1, flexDirection: "row", gap: 6, justifyContent: "center" }}>
        <Pill icon={require("../../assets/ui/wallet.png")} text={balanceText ?? balance.toLocaleString(undefined, { maximumFractionDigits: 0 })} color="#E5E7EB" />
        <Pill icon={require("../../assets/ui/coins.png")} text={pnl === null ? "+0.00" : `${pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}`} color={pnlColor} />
      </View>
      {hasPoints ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <View style={{ flexDirection: "row", gap: 4, backgroundColor: fade(C.lime, 0.2), borderColor: C.lime, borderWidth: 2, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 5 }}>
            <Text style={{ color: C.lime, fontSize: 10 }}>●</Text>
            <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 11 }}>+{minutes ?? 1}m</Text>
          </View>
          <Pressable onPress={onClear}>
            <NeoBox bg="#EF4444" border={C.bg} borderWidth={2} radius={8} shadow={3} shadowColor={C.bg} innerStyle={{ width: 32, height: 32, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.white, fontFamily: F.black }}>✕</Text>
            </NeoBox>
          </Pressable>
        </View>
      ) : (
        <Text style={{ color: fade(C.lime, 0.6), fontFamily: F.bold, fontSize: 12 }}>Draw ↑</Text>
      )}
    </View>
  );
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: "play", label: "Play", icon: "✏️" },
  { id: "leaderboard", label: "Leaderboard", icon: "🏆" },
  { id: "history", label: "History", icon: "📜" },
];

export function TabBar({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  return (
    <View style={{ flexDirection: "row", backgroundColor: C.purple, borderTopWidth: 4, borderTopColor: C.lime }}>
      {TABS.map((t) => {
        const on = t.id === tab;
        return (
          <Pressable key={t.id} onPress={() => onTab(t.id)} style={{ flex: 1, alignItems: "center", paddingVertical: 10, backgroundColor: on ? C.bg : "transparent" }}>
            <Text style={{ fontSize: 16 }}>{t.icon}</Text>
            <Text style={{ fontFamily: F.venite, fontSize: 11, marginTop: 2, color: on ? C.lime : fade(C.white, 0.8), textTransform: "uppercase", letterSpacing: 1, borderBottomWidth: 2, borderBottomColor: on ? C.lime : "transparent" }}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
