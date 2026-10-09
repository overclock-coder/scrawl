import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { ASSET } from "../config";
import { scoreRound } from "../logic/scoring";
import { PriceWindow } from "../logic/priceWindow";
import { RoundRecord, WINDOW } from "../logic/types";
import { feed } from "../services/priceFeed";
import { useStore } from "../state/store";
import { money } from "../ui/hooks";
import { LineChart } from "../ui/LineChart";
import { C } from "../ui/theme";
import { RoundPlan } from "./PlayScreen";

export function RoundScreen({ plan, onDone, onAbort }: { plan: RoundPlan; onDone: (id: string) => void; onAbort: () => void }) {
  useKeepAwake();
  const { finishRound, stakeOut } = useStore();
  const win = useRef(new PriceWindow(plan.startedAt));
  const done = useRef(false);
  const [width, setWidth] = useState(320);
  const [, force] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (feed.last) win.current.tick(feed.last, Date.now());
    const off = feed.onPrice((p, at) => win.current.tick(p, at));
    const t = setInterval(() => {
      const now = Date.now();
      // Re-assert the latest price each pass so quiet seconds are not blank.
      if (feed.last) win.current.tick(feed.last, now);
      setElapsed(Math.min((now - plan.startedAt) / 1000, WINDOW));
      force((n) => n + 1);
      if (!done.current && win.current.isComplete(now)) {
        done.current = true;
        finish();
      }
    }, 250);
    return () => {
      off();
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const finish = () => {
    try {
      const actual = win.current.prices();
      const score = scoreRound(plan.predicted, actual, plan.stake, plan.leverage);
      const rec: RoundRecord = {
        id: String(plan.startedAt),
        asset: ASSET,
        startedAt: plan.startedAt,
        stake: plan.stake,
        leverage: plan.leverage,
        predicted: plan.predicted,
        actual,
        score,
        commitHash: plan.commitHash,
        commitSig: plan.commitSig,
      };
      finishRound(rec);
      Haptics.notificationAsync(score.pnl >= 0 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
      onDone(rec.id);
    } catch {
      stakeOut(-plan.stake); // no price data: refund the stake
      onAbort();
    }
  };

  const partial = win.current.partial();
  let carry: number | undefined;
  const shown = partial.map((v, i) => {
    if (v !== undefined) carry = v;
    return i <= Math.floor(elapsed) ? carry : undefined;
  });
  const now = [...shown].reverse().find((v) => v !== undefined);
  const start = shown.find((v) => v !== undefined);
  const delta = now !== undefined && start !== undefined ? now - start : 0;

  return (
    <View style={s.wrap}>
      <Text style={s.head}>{ASSET}/USDT · {plan.leverage}x · {plan.stake} ink</Text>
      <Text style={s.clock}>{Math.max(0, Math.ceil(WINDOW - elapsed))}s</Text>
      <Text style={[s.price, { color: delta >= 0 ? C.up : C.down }]}>{now ? `$${money(now)}` : "…"}</Text>
      <View style={s.chart} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <LineChart width={width} height={300} predicted={plan.predicted} actual={shown} />
      </View>
      <View style={s.legend}>
        <Text style={{ color: C.pred }}>┄ your drawing</Text>
        <Text style={{ color: C.accent }}>━ real price</Text>
      </View>
      <Text style={s.note}>
        {plan.commitSig ? "Drawing sealed on Solana before this round started." : "Practice round: not sealed on-chain."}
      </Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, padding: 16 },
  head: { color: C.dim, fontWeight: "700", textAlign: "center" },
  clock: { color: C.text, fontSize: 64, fontWeight: "900", textAlign: "center", marginTop: 4 },
  price: { fontSize: 22, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  chart: { backgroundColor: C.card, borderRadius: 18, borderWidth: 1, borderColor: C.line, overflow: "hidden" },
  legend: { flexDirection: "row", justifyContent: "space-around", marginTop: 12 },
  note: { color: C.dim, textAlign: "center", marginTop: 20, fontSize: 13 },
});
