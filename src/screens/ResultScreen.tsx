import React, { useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";
import { EXPLORER } from "../config";
import { hashPrices, settleMemo } from "../logic/commit";
import { classifyWalletError } from "../logic/walletErrors";
import { sendMemo } from "../solana/wallet";
import { useStore } from "../state/store";
import { fmtAmount, money } from "../ui/hooks";
import { NeoBox, NeoButton, Venite } from "../ui/neo";
import { PriceChart } from "../ui/PriceChart";
import { C, F, fade } from "../ui/theme";

export function ResultScreen({ ids, onAgain }: { ids: string[]; onAgain: () => void }) {
  const { history, session, patchRound } = useStore();
  const rounds = ids.map((id) => history.find((h) => h.id === id)).filter((r): r is NonNullable<typeof r> => !!r).sort((a, b) => a.startedAt - b.startedAt);
  const [sel, setSel] = useState(0);
  const [width, setWidth] = useState(300);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  if (!rounds.length) return null;

  const r = rounds[Math.min(sel, rounds.length - 1)];
  const total = rounds.reduce((a, x) => a + x.score.pnl, 0);
  const win = total >= 0;
  const live = !!r.live;

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
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 28 }}>
      <View style={{ alignItems: "center", marginVertical: 8 }}>
        <Text style={{ color: fade(C.white, 0.7), fontFamily: F.bold, fontSize: 12 }}>{rounds.length > 1 ? `BATCH PnL · ${rounds.length} positions` : "ROUND PnL"}</Text>
        <Venite size={40} color={win ? C.lime : "#FCA5A5"} off={3}>{`${win ? "+" : ""}${live ? total.toFixed(4) : money(total)}`}</Venite>
        <Text style={{ color: fade(C.white, 0.7), fontFamily: F.regular }}>{live ? "devnet SOL" : "SCP"}</Text>
      </View>

      {rounds.length > 1 && (
        <View style={{ flexDirection: "row", gap: 8, marginBottom: 10 }}>
          {rounds.map((x, i) => (
            <Pressable key={x.id} onPress={() => setSel(i)} style={{ flex: 1 }}>
              <NeoBox bg={i === sel ? C.lime : C.purple} border={C.lime} borderWidth={3} radius={10} shadow={3} shadowColor={i === sel ? C.purple : C.lime} innerStyle={{ paddingVertical: 8, alignItems: "center" }}>
                <Text style={{ color: i === sel ? C.purple : C.lime, fontFamily: F.black, fontSize: 12 }}>#{i + 1}</Text>
                <Text style={{ color: i === sel ? C.purple : x.score.pnl >= 0 ? C.green : "#FCA5A5", fontFamily: F.mono, fontSize: 8 }}>{x.score.pnl >= 0 ? "+" : ""}{x.score.pnl.toFixed(live ? 4 : 2)}</Text>
              </NeoBox>
            </Pressable>
          ))}
        </View>
      )}

      <NeoBox shadow={6} radius={16} innerStyle={{ padding: 10, overflow: "hidden" }}>
        <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 15 }}>{(r.score.accuracy * 100).toFixed(1)}% accuracy</Text>
        <Text style={{ color: fade(C.white, 0.6), fontFamily: F.regular, fontSize: 12, marginBottom: 6 }}>{r.score.correct}/{r.score.compared} price moves called right</Text>
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
          <PriceChart width={width} height={220} series={r.actual} overlay={r.predicted} cat={false} />
        </View>
      </NeoBox>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 14 }}>
        {[
          ["Stake", live ? `${r.stake}` : money(r.stake)],
          ["Leverage", `${r.leverage}x`],
          ["Payout", live ? r.score.payout.toFixed(4) : money(r.score.payout)],
        ].map(([k, v]) => (
          <NeoBox key={k} bg={fade(C.purple, 0.6)} border={C.lime} borderWidth={3} radius={12} shadow={3} shadowColor={C.lime} style={{ flex: 1 }} innerStyle={{ padding: 10 }}>
            <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 17 }}>{v}</Text>
            <Text style={{ color: fade(C.white, 0.6), fontFamily: F.regular, fontSize: 11 }}>{k}</Text>
          </NeoBox>
        ))}
      </View>
      <Text style={{ color: fade(C.white, 0.5), fontFamily: F.regular, fontSize: 11, marginTop: 8 }}>
        50% accuracy is break-even · 2% fee on profit only ({fmtAmount(live, r.score.fee)} taken)
      </Text>

      <Venite size={16} off={2} style={{ marginTop: 18, marginBottom: 10 }}>Proof on Solana (devnet)</Venite>
      <View style={{ gap: 12 }}>
        {r.commitSig ? (
          <NeoButton kind="light" small title={live ? "View stake transaction ↗" : "View commit transaction ↗"} onPress={() => Linking.openURL(EXPLORER(r.commitSig as string))} />
        ) : (
          <Text style={{ color: fade(C.white, 0.6), fontFamily: F.regular, fontSize: 12 }}>Practice round. Connect a wallet to seal drawings.</Text>
        )}
        {!live && r.commitSig && !r.settleSig && session && <NeoButton kind="dark" small title={busy ? "Waiting for wallet…" : "Settle result on-chain"} disabled={busy} onPress={settle} />}
        {r.settleSig && <NeoButton kind="light" small title={live ? "View payout transaction ↗" : "View settlement transaction ↗"} onPress={() => Linking.openURL(EXPLORER(r.settleSig as string))} />}
      </View>
      {msg && <Text style={{ color: C.gold, marginTop: 8, fontFamily: F.regular }}>{msg}</Text>}

      <NeoButton title="Draw again 🚀" onPress={onAgain} style={{ marginTop: 22 }} />
    </ScrollView>
  );
}
