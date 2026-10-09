import React, { useMemo, useState } from "react";
import { FlatList, Pressable, Text, View } from "react-native";
import { useStore } from "../state/store";
import { short } from "../ui/hooks";
import { NeoBox, Venite } from "../ui/neo";
import { C, F, fade } from "../ui/theme";

interface Row { name: string; avatar: string; address: string; pnl: number; winRate: number; trades: number; best: number; accuracy: number; you?: boolean }

// Sample traders so the board is populated until a shared, verifiable board exists.
const SAMPLE: Row[] = [
  { name: "CurveKing", avatar: "👑", address: "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin", pnl: 412.8, winRate: 68.2, trades: 143, best: 96.4, accuracy: 61.3 },
  { name: "LineWhisperer", avatar: "🧙", address: "7vN2tYb1pQyJrK3XmZc8uHfWd4aLsE5GhTq6RkP9oBCx", pnl: 287.1, winRate: 63.5, trades: 201, best: 71.0, accuracy: 58.9 },
  { name: "PatternPro", avatar: "🎯", address: "DkE4mPz8qWvR2nJtYx6bC9sLhU3aFgT7oQ1VeNiMwK5y", pnl: 164.4, winRate: 59.1, trades: 88, best: 54.2, accuracy: 57.4 },
  { name: "DrawMaster", avatar: "✏️", address: "3hPq9TnXc5RvYe2LmWz8bKdJ4sFuA7gNoQ6iUtCxE1rB", pnl: 91.9, winRate: 55.0, trades: 120, best: 33.8, accuracy: 55.6 },
  { name: "NyanMaster", avatar: "🐱", address: "BzTe6RkL2mNqXw8YpC4vHjD9sUa3FgE5oQ7iWtKxP1nM", pnl: 12.3, winRate: 51.4, trades: 70, best: 22.1, accuracy: 51.9 },
  { name: "SlowScrawler", avatar: "🥷", address: "5cWn8QxR3mTvY6eLpK2jBdH9sUa4FgZ7oE1iNtCxP7yA", pnl: -48.6, winRate: 44.0, trades: 59, best: 18.0, accuracy: 47.2 },
];

type Sort = "pnl" | "winRate" | "best";
const SORTS: { id: Sort; label: string }[] = [
  { id: "pnl", label: "Total PnL" },
  { id: "winRate", label: "Win Rate" },
  { id: "best", label: "Best Trade" },
];

const rankColors = (r: number) =>
  r === 1 ? { bg: "#FACC15", fg: C.bg } : r === 2 ? { bg: "#D1D5DB", fg: C.bg } : r === 3 ? { bg: "#D97706", fg: C.white } : { bg: C.purple, fg: C.lime };
const badge = (r: number) => (r === 1 ? "🥇" : r === 2 ? "🥈" : r === 3 ? "🥉" : String(r));

export function Leaderboard() {
  const { history, session } = useStore();
  const [sort, setSort] = useState<Sort>("pnl");

  const rows = useMemo(() => {
    const you: Row | null = history.length
      ? {
          name: "You",
          avatar: "🎨",
          address: session?.address ?? "local-device-player",
          pnl: history.filter((h) => !h.live).reduce((a, h) => a + h.score.pnl, 0), // ink only; SOL rounds are tracked separately
          winRate: (history.filter((h) => h.score.pnl > 0).length / history.length) * 100,
          trades: history.length,
          best: history.filter((h) => !h.live).reduce((m, h) => Math.max(m, h.score.pnl), 0),
          accuracy: (history.reduce((a, h) => a + h.score.accuracy, 0) / history.length) * 100,
          you: true,
        }
      : null;
    return [...SAMPLE, ...(you ? [you] : [])].sort((a, b) => b[sort] - a[sort]);
  }, [history, session, sort]);

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => r.address}
      contentContainerStyle={{ padding: 12, paddingBottom: 24 }}
      ListHeaderComponent={
        <View style={{ alignItems: "center", marginTop: 6, marginBottom: 16 }}>
          <Venite size={30} off={3}>Leaderboard</Venite>
          <Text style={{ color: fade(C.white, 0.7), fontFamily: F.regular, marginTop: 6 }}>Top scrawlers by performance</Text>
          <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
            {SORTS.map((s) => (
              <Pressable key={s.id} onPress={() => setSort(s.id)}>
                <NeoBox bg={sort === s.id ? C.lime : fade(C.purple, 0.6)} border={sort === s.id ? C.purple : C.lime} borderWidth={3} radius={9} shadow={3} shadowColor={sort === s.id ? C.bg : C.lime} innerStyle={{ paddingHorizontal: 10, paddingVertical: 7 }}>
                  <Text style={{ color: sort === s.id ? C.purple : C.lime, fontFamily: F.black, fontSize: 12 }}>{s.label}</Text>
                </NeoBox>
              </Pressable>
            ))}
          </View>
        </View>
      }
      renderItem={({ item: t, index }) => {
        const rank = index + 1;
        const rc = rankColors(rank);
        return (
          <View style={{ marginBottom: 10 }}>
            <NeoBox bg={t.you ? fade(C.purple, 0.9) : fade(C.bg, 0.92)} border={t.you ? C.lime : fade(C.lime, 0.5)} borderWidth={t.you ? 3 : 2} radius={14} shadow={4} shadowColor={C.purple} innerStyle={{ padding: 12, flexDirection: "row", alignItems: "center", gap: 10 }}>
              <View style={{ width: 38, height: 38, borderRadius: 9, backgroundColor: rc.bg, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: rc.fg, fontFamily: F.black, fontSize: rank <= 3 ? 18 : 15 }}>{badge(rank)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontSize: 20 }}>{t.avatar}</Text>
                  <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 15 }}>{t.name}</Text>
                  {t.you && <Text style={{ backgroundColor: C.lime, color: C.purple, fontFamily: F.black, fontSize: 10, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4, overflow: "hidden" }}>You</Text>}
                </View>
                <Text style={{ color: fade(C.white, 0.5), fontFamily: F.mono, fontSize: 11 }}>{short(t.address)} · {t.trades} {t.trades === 1 ? "trade" : "trades"} · {t.winRate.toFixed(0)}% win</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={{ color: t.pnl >= 0 ? C.lime : C.red, fontFamily: F.black, fontSize: 17 }}>{t.pnl >= 0 ? "+" : ""}{t.pnl.toFixed(1)}</Text>
                <Text style={{ color: fade(C.white, 0.5), fontFamily: F.regular, fontSize: 10 }}>best {t.best.toFixed(1)}</Text>
              </View>
            </NeoBox>
          </View>
        );
      }}
      ListFooterComponent={<Text style={{ color: fade(C.white, 0.45), fontFamily: F.regular, fontSize: 11, textAlign: "center", marginTop: 8 }}>Sample traders shown beside your own results until a shared board exists. Scores are computed on-device.</Text>}
    />
  );
}
