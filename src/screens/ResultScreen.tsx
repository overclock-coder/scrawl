import React, { useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { EXPLORER } from "../config";
import { hashPrices, settleMemo } from "../logic/commit";
import { classifyWalletError } from "../logic/walletErrors";
import { sendMemo } from "../solana/wallet";
import { useStore } from "../state/store";
import { money } from "../ui/hooks";
import { LineChart } from "../ui/LineChart";
import { Button, Stat } from "../ui/kit";
import { C } from "../ui/theme";

export function ResultScreen({ id, onAgain }: { id: string; onAgain: () => void }) {
  const { history, session, patchRound } = useStore();
  const r = history.find((h) => h.id === id);
  const [width, setWidth] = useState(320);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!r) return null;

  const win = r.score.pnl >= 0;
  const settle = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const { signature } = await sendMemo(settleMemo(r.commitHash, hashPrices(r.actual), r.score.accuracy * 100));
      patchRound(r.id, { settleSig: signature });
    } catch (e) {
      setMsg(classifyWalletError(e).message);
    }
    setBusy(false);
  };

  return (
    <ScrollView contentContainerStyle={s.wrap}>
      <Text style={[s.big, { color: win ? C.up : C.down }]}>{win ? "+" : ""}{money(r.score.pnl)} ink</Text>
      <Text style={s.sub}>{(r.score.accuracy * 100).toFixed(1)}% direction accuracy · {r.score.correct}/{r.score.compared} moves</Text>

      <View style={s.chart} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <LineChart width={width} height={220} predicted={r.predicted} actual={r.actual} />
      </View>

      <View style={s.row}>
        <Stat label="Stake" value={money(r.stake)} />
        <Stat label="Leverage" value={`${r.leverage}x`} />
        <Stat label="Payout" value={money(r.score.payout)} color={win ? C.up : C.down} />
      </View>
      <Text style={s.fine}>50% accuracy is break-even · 2% fee on profit only ({money(r.score.fee)} taken)</Text>

      <Text style={s.h}>Proof on Solana (devnet)</Text>
      {r.commitSig ? (
        <Button kind="ghost" title="View commit transaction" onPress={() => Linking.openURL(EXPLORER(r.commitSig as string))} style={{ marginBottom: 10 }} />
      ) : (
        <Text style={s.fine}>This was a practice round. Connect a wallet to seal drawings.</Text>
      )}
      {r.commitSig && !r.settleSig && session && (
        <Button title="Settle result on-chain" onPress={settle} busy={busy} style={{ marginBottom: 10 }} />
      )}
      {r.settleSig && <Button kind="ghost" title="View settlement transaction" onPress={() => Linking.openURL(EXPLORER(r.settleSig as string))} style={{ marginBottom: 10 }} />}
      {msg && <Text style={s.err}>{msg}</Text>}

      <Button title="Draw again" onPress={onAgain} style={{ marginTop: 8 }} />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 40 },
  big: { fontSize: 44, fontWeight: "900", textAlign: "center", marginTop: 8 },
  sub: { color: C.dim, textAlign: "center", marginBottom: 16 },
  chart: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: "hidden", marginBottom: 12 },
  row: { flexDirection: "row", gap: 8 },
  fine: { color: C.dim, fontSize: 12, marginTop: 10, marginBottom: 8 },
  h: { color: C.text, fontWeight: "800", fontSize: 16, marginTop: 14, marginBottom: 10 },
  err: { color: C.warn, marginBottom: 8 },
});
