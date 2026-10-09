import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { ASSET, BAND_PCT, EXPLORER } from "../config";
import { commitMemo, hashPrices } from "../logic/commit";
import { MIN_COVERAGE, coverage, strokeToPrices } from "../logic/sampling";
import { MAX_LEVERAGE } from "../logic/scoring";
import { Point } from "../logic/types";
import { classifyWalletError } from "../logic/walletErrors";
import { feed } from "../services/priceFeed";
import { useStore } from "../state/store";
import { sendMemo } from "../solana/wallet";
import { DrawPad, PAD_HEIGHT } from "../ui/DrawPad";
import { useFeed, money } from "../ui/hooks";
import { Button, Chip } from "../ui/kit";
import { C } from "../ui/theme";
import { WalletChip } from "./WalletChip";

export interface RoundPlan {
  predicted: number[];
  stake: number;
  leverage: number;
  startPrice: number;
  commitHash: string;
  commitSig?: string;
  startedAt: number;
}

const STAKES = [10, 25, 50, 100];
const LEVS = [5, 10, 25, 50, MAX_LEVERAGE];

export function PlayScreen({ onStart }: { onStart: (p: RoundPlan) => void }) {
  const { balance, streak, session, bonusAvailable, claimBonus, stakeOut } = useStore();
  const { price, status } = useFeed();
  const [stroke, setStroke] = useState<Point[]>([]);
  const [width, setWidth] = useState(320);
  const [drawing, setDrawing] = useState(false);
  const [stake, setStake] = useState(25);
  const [lev, setLev] = useState(10);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const ready = coverage(stroke, width) >= MIN_COVERAGE;
  const live = status === "live" && price != null;
  const canGo = ready && live && stake <= balance;

  const go = async () => {
    const startPrice = feed.last;
    if (!startPrice) return;
    setMsg(null);
    const predicted = strokeToPrices(stroke, width, PAD_HEIGHT, startPrice, BAND_PCT);
    const commitHash = hashPrices(predicted);
    let commitSig: string | undefined;

    if (session) {
      setBusy(true);
      try {
        // The drawing is committed on-chain BEFORE the 60s window begins.
        commitSig = (await sendMemo(commitMemo(commitHash, ASSET, lev, Date.now()))).signature;
      } catch (e) {
        setMsg(classifyWalletError(e).message);
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    stakeOut(stake);
    onStart({ predicted, stake, leverage: lev, startPrice, commitHash, commitSig, startedAt: Date.now() });
    setStroke([]);
  };

  return (
    <ScrollView
      contentContainerStyle={s.wrap}
      scrollEnabled={!drawing}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={s.top}>
        <View>
          <Text style={s.pair}>{ASSET}/USDT</Text>
          <Text style={s.price}>{price ? `$${money(price)}` : "…"}</Text>
          <Text style={[s.live, { color: live ? C.up : C.warn }]}>{live ? "● live" : status === "stale" ? "○ reconnecting" : "○ connecting"}</Text>
        </View>
        <WalletChip />
      </View>

      <View style={s.row}>
        <Text style={s.meta}>🔥 {streak.count}-day streak</Text>
        <Text style={s.meta}>◎ {money(balance)} ink</Text>
      </View>
      {bonusAvailable && (
        <Button kind="ghost" title="Claim daily ink +100" onPress={() => claimBonus()} style={{ height: 44, marginBottom: 12 }} />
      )}

      <DrawPad stroke={stroke} onStroke={setStroke} onSize={setWidth} width={width} onDrawing={setDrawing} />
      <View style={s.rowEnd}>
        <Button kind="ghost" title="Clear" onPress={() => setStroke([])} disabled={!stroke.length} style={{ height: 40, paddingHorizontal: 18 }} />
      </View>

      <Text style={s.label}>Stake (ink)</Text>
      <View style={s.chips}>
        {STAKES.map((v) => (
          <Chip key={v} label={String(v)} on={stake === v} onPress={() => setStake(v)} disabled={v > balance} />
        ))}
      </View>
      <Text style={s.label}>Leverage</Text>
      <View style={s.chips}>
        {LEVS.map((v) => (
          <Chip key={v} label={`${v}x`} on={lev === v} onPress={() => setLev(v)} />
        ))}
      </View>

      <Text style={s.note}>
        {session
          ? "Your drawing is hashed and sealed on Solana devnet with your wallet before the clock starts."
          : "Connect a wallet to seal your drawing on Solana. Without one, rounds are practice only."}
      </Text>
      {msg && <Text style={s.err}>{msg}</Text>}

      <Button
        title={busy ? "Waiting for wallet…" : ready ? "Lock it in · 60s" : "Draw across the pad first"}
        onPress={go}
        busy={busy}
        disabled={!canGo}
        style={{ marginTop: 8 }}
      />
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingBottom: 32 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  pair: { color: C.dim, fontWeight: "700" },
  price: { color: C.text, fontSize: 34, fontWeight: "800" },
  live: { fontSize: 12, marginTop: 2 },
  row: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  rowEnd: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  meta: { color: C.dim, fontWeight: "600" },
  label: { color: C.dim, marginTop: 8, marginBottom: 8, fontWeight: "600" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  note: { color: C.dim, fontSize: 13, marginTop: 16, lineHeight: 18 },
  err: { color: C.warn, marginTop: 10 },
});
