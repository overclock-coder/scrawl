import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { classifyWalletError } from "../logic/walletErrors";
import { airdrop, disconnectWallet, getBalanceSol } from "../solana/wallet";
import { useStore } from "../state/store";
import { money } from "../ui/hooks";
import { Button, Stat } from "../ui/kit";
import { C } from "../ui/theme";
import { WalletChip } from "./WalletChip";

export function StatsScreen({ onOpen }: { onOpen: (id: string) => void }) {
  const { history, streak, session, setSession } = useStore();
  const [sol, setSol] = useState<number | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return setSol(null);
    getBalanceSol(session.address).then(setSol).catch(() => setSol(null));
  }, [session]);

  const wins = history.filter((h) => h.score.pnl > 0).length;
  const total = history.reduce((a, h) => a + h.score.pnl, 0);
  const best = history.reduce((m, h) => Math.max(m, h.score.pnl), 0);
  const avgAcc = history.length ? history.reduce((a, h) => a + h.score.accuracy, 0) / history.length : 0;

  const drop = async () => {
    if (!session) return;
    setBusy(true);
    setMsg(null);
    try {
      await airdrop(session.address);
      setSol(await getBalanceSol(session.address));
    } catch (e) {
      setMsg(`Devnet faucet: ${classifyWalletError(e).message}`);
    }
    setBusy(false);
  };

  return (
    <FlatList
      data={history}
      keyExtractor={(h) => h.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      ListHeaderComponent={
        <View>
          <View style={s.row}>
            <Text style={s.title}>Your record</Text>
            <WalletChip />
          </View>
          <View style={s.row2}>
            <Stat label="Rounds" value={String(history.length)} />
            <Stat label="Win rate" value={history.length ? `${Math.round((wins / history.length) * 100)}%` : "–"} />
            <Stat label="Streak" value={`${streak.count}d`} />
          </View>
          <View style={[s.row2, { marginTop: 8 }]}>
            <Stat label="Total PnL" value={money(total)} color={total >= 0 ? C.up : C.down} />
            <Stat label="Best round" value={money(best)} />
            <Stat label="Avg accuracy" value={history.length ? `${(avgAcc * 100).toFixed(0)}%` : "–"} />
          </View>
          {session && (
            <View style={s.wallet}>
              <Text style={s.walletText}>Devnet balance: {sol == null ? "…" : `${sol.toFixed(3)} SOL`}</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
                <Button kind="ghost" title="Get 1 devnet SOL" onPress={drop} busy={busy} style={{ flex: 1, height: 44 }} />
                <Button
                  kind="ghost"
                  title="Disconnect"
                  onPress={async () => {
                    await disconnectWallet();
                    setSession(null);
                  }}
                  style={{ height: 44 }}
                />
              </View>
              {msg && <Text style={s.err}>{msg}</Text>}
            </View>
          )}
          <Text style={s.h}>History</Text>
          {!history.length && <Text style={s.empty}>No rounds yet. Draw your first prediction.</Text>}
        </View>
      }
      renderItem={({ item: h }) => (
        <Pressable style={s.item} onPress={() => onOpen(h.id)}>
          <View>
            <Text style={s.itemTop}>{new Date(h.startedAt).toLocaleString()}</Text>
            <Text style={s.itemSub}>{(h.score.accuracy * 100).toFixed(0)}% · {h.leverage}x · {h.commitSig ? "sealed" : "practice"}</Text>
          </View>
          <Text style={[s.pnl, { color: h.score.pnl >= 0 ? C.up : C.down }]}>{h.score.pnl >= 0 ? "+" : ""}{money(h.score.pnl)}</Text>
        </Pressable>
      )}
    />
  );
}

const s = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  row2: { flexDirection: "row", gap: 8 },
  title: { color: C.text, fontSize: 26, fontWeight: "900" },
  h: { color: C.text, fontWeight: "800", fontSize: 16, marginTop: 20, marginBottom: 10 },
  empty: { color: C.dim },
  wallet: { backgroundColor: C.card, borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: C.line },
  walletText: { color: C.text, fontWeight: "700" },
  err: { color: C.warn, marginTop: 8, fontSize: 12 },
  item: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: C.line },
  itemTop: { color: C.text, fontWeight: "600" },
  itemSub: { color: C.dim, fontSize: 12, marginTop: 2 },
  pnl: { fontSize: 18, fontWeight: "800" },
});
