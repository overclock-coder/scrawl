import React, { useMemo, useState } from "react";
import { FlatList, Linking, Pressable, Text, View } from "react-native";
import { EXPLORER } from "../config";
import { useStore } from "../state/store";
import { money, short } from "../ui/hooks";
import { NeoBox, NeoButton, Venite } from "../ui/neo";
import { C, F, fade } from "../ui/theme";

type Sort = "time" | "pnl";

export function HistoryScreen({ onOpen, onWallet }: { onOpen: (id: string) => void; onWallet: () => void }) {
  const { history, session, streak } = useStore();
  const [sort, setSort] = useState<Sort>("time");

  const stats = useMemo(() => {
    const n = history.length;
    const wins = history.filter((h) => h.score.pnl > 0).length;
    return {
      n,
      winRate: n ? (wins / n) * 100 : 0,
      pnl: history.reduce((a, h) => a + h.score.pnl, 0),
      best: history.reduce((m, h) => Math.max(m, h.score.pnl), 0),
    };
  }, [history]);

  const rows = useMemo(() => [...history].sort((a, b) => (sort === "pnl" ? b.score.pnl - a.score.pnl : b.startedAt - a.startedAt)), [history, sort]);
  const cards: [string, string, string, string?][] = [
    ["📊", "Total trades", String(stats.n)],
    ["🎯", "Win rate", `${stats.winRate.toFixed(1)}%`],
    ["💰", "Total PnL", money(stats.pnl), stats.pnl < 0 ? C.red : undefined],
    ["🔥", "Day streak", String(streak.count)],
  ];

  return (
    <FlatList
      data={rows}
      keyExtractor={(h) => h.id}
      contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      ListHeaderComponent={
        <View>
          <View style={{ alignItems: "center", marginTop: 6, marginBottom: 14 }}>
            <Venite size={30} off={3}>Trade History</Venite>
            <Text style={{ color: fade(C.white, 0.7), fontFamily: F.regular, marginTop: 6 }}>Your scrawls, scored</Text>
          </View>
          {!session && (
            <NeoBox bg={fade(C.purple, 0.8)} shadow={5} shadowColor={C.lime} radius={14} innerStyle={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }} style={{ marginBottom: 14 }}>
              <Text style={{ fontSize: 34 }}>🔐</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 16 }}>Connect Your Wallet</Text>
                <Text style={{ color: fade(C.white, 0.65), fontFamily: F.regular, fontSize: 12 }}>Seal drawings on Solana and keep proof links.</Text>
              </View>
              <NeoButton small kind="primary" title="Connect" onPress={onWallet} />
            </NeoBox>
          )}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
            {cards.map(([icon, label, value, color]) => (
              <View key={label} style={{ width: "47%" }}>
                <NeoBox bg={fade(C.purple, 0.6)} border={C.lime} borderWidth={3} radius={12} shadow={4} shadowColor={C.lime} innerStyle={{ padding: 12 }}>
                  <Text style={{ fontSize: 20 }}>{icon}</Text>
                  <Text style={{ color: color ?? C.lime, fontFamily: F.black, fontSize: 22 }}>{value}</Text>
                  <Text style={{ color: fade(C.white, 0.6), fontFamily: F.regular, fontSize: 11 }}>{label}</Text>
                </NeoBox>
              </View>
            ))}
          </View>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginBottom: 14 }}>
            {(["time", "pnl"] as Sort[]).map((s) => (
              <Pressable key={s} onPress={() => setSort(s)}>
                <NeoBox bg={sort === s ? C.lime : fade(C.purple, 0.6)} border={sort === s ? C.purple : C.lime} borderWidth={3} radius={9} shadow={3} shadowColor={sort === s ? C.bg : C.lime} innerStyle={{ paddingHorizontal: 14, paddingVertical: 7 }}>
                  <Text style={{ color: sort === s ? C.purple : C.lime, fontFamily: F.black, fontSize: 12 }}>{s === "time" ? "Latest" : "Best PnL"}</Text>
                </NeoBox>
              </Pressable>
            ))}
          </View>
        </View>
      }
      ListEmptyComponent={
        <View style={{ alignItems: "center", padding: 24 }}>
          <Text style={{ color: fade(C.white, 0.7), fontFamily: F.bold, fontSize: 18 }}>No trades yet</Text>
          <Text style={{ color: fade(C.white, 0.5), fontFamily: F.regular, marginTop: 4 }}>Start trading to see your history here!</Text>
        </View>
      }
      renderItem={({ item: h }) => {
        const pos = h.score.pnl >= 0;
        return (
          <Pressable onPress={() => onOpen(h.id)} style={{ marginBottom: 10 }}>
            <NeoBox bg={fade(C.bg, 0.92)} border={fade(C.lime, 0.5)} borderWidth={2} radius={14} shadow={4} innerStyle={{ padding: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                <View>
                  <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 14 }}>{h.commitSig ? "🔒 Sealed round" : "Practice round"}</Text>
                  <Text style={{ color: fade(C.white, 0.5), fontFamily: F.regular, fontSize: 11 }}>{new Date(h.startedAt).toLocaleString()}</Text>
                </View>
                <Text style={{ color: pos ? C.lime : C.red, fontFamily: F.black, fontSize: 19 }}>{pos ? "+" : ""}{h.score.pnl.toFixed(2)}</Text>
              </View>
              <View style={{ flexDirection: "row", justifyContent: "space-between", marginTop: 8 }}>
                <Text style={{ color: fade(C.white, 0.75), fontFamily: F.regular, fontSize: 12 }}>Stake {money(h.stake)} · {h.leverage}x</Text>
                <Text style={{ color: fade(C.white, 0.75), fontFamily: F.regular, fontSize: 12 }}>{(h.score.accuracy * 100).toFixed(0)}% accuracy</Text>
                {h.commitSig ? (
                  <Text onPress={() => Linking.openURL(EXPLORER(h.commitSig as string))} style={{ color: C.lime, fontFamily: F.mono, fontSize: 12, textDecorationLine: "underline" }}>{short(h.commitSig)}</Text>
                ) : (
                  <Text style={{ color: fade(C.white, 0.35), fontFamily: F.mono, fontSize: 12 }}>no tx</Text>
                )}
              </View>
            </NeoBox>
          </Pressable>
        );
      }}
    />
  );
}
