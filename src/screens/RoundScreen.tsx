import React, { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { useKeepAwake } from "expo-keep-awake";
import * as Haptics from "expo-haptics";
import { ASSET } from "../config";
import { PriceWindow } from "../logic/priceWindow";
import { scoreRound } from "../logic/scoring";
import { RoundRecord, WINDOW } from "../logic/types";
import { feed } from "../services/priceFeed";
import { useStore } from "../state/store";
import { money } from "../ui/hooks";
import { NeoBox, Venite } from "../ui/neo";
import { PriceChart } from "../ui/PriceChart";
import { C, F, fade } from "../ui/theme";
import { RoundPlan } from "./PlayScreen";

const MESSAGES = ["Trading...", "Future booming...", "Position active..."];

/** Runs `plan.count` back-to-back 60 s positions against the live feed and records each one. */
export function RoundScreen({ plan, onDone, onAbort }: { plan: RoundPlan; onDone: (ids: string[]) => void; onAbort: () => void }) {
  useKeepAwake();
  const { finishRound, stakeOut } = useStore();
  const wins = useRef(Array.from({ length: plan.count }, (_, i) => new PriceWindow(plan.startedAt + i * WINDOW * 1000)));
  const finished = useRef<string[]>([]);
  const scored = useRef<string[]>([]);
  const [width, setWidth] = useState(300);
  const [now, setNow] = useState(Date.now());
  const [msgI, setMsgI] = useState(0);

  useEffect(() => {
    const tickAll = (p: number, at: number) => wins.current.forEach((w) => w.tick(p, at));
    if (feed.last) tickAll(feed.last, Date.now());
    const off = feed.onPrice(tickAll);
    const t = setInterval(() => {
      const n = Date.now();
      if (feed.last) tickAll(feed.last, n); // quiet seconds are not blank
      setNow(n);
      wins.current.forEach((w, i) => {
        const id = `${plan.startedAt + i * WINDOW * 1000}`;
        if (finished.current.includes(id) || !w.isComplete(n)) return;
        finished.current.push(id);
        settle(i, w, id);
      });
    }, 250);
    const m = setInterval(() => setMsgI((x) => (x + 1) % MESSAGES.length), 2200);
    return () => {
      off();
      clearInterval(t);
      clearInterval(m);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const settle = (i: number, w: PriceWindow, id: string) => {
    try {
      const actual = w.prices();
      const score = scoreRound(plan.predicted, actual, plan.stake, plan.leverage);
      const rec: RoundRecord = {
        id,
        asset: ASSET,
        startedAt: plan.startedAt + i * WINDOW * 1000,
        stake: plan.stake,
        leverage: plan.leverage,
        predicted: plan.predicted,
        actual,
        score,
        commitHash: plan.commitHash,
        commitSig: plan.commitSig,
      };
      finishRound(rec);
      scored.current.push(id);
      Haptics.notificationAsync(score.pnl >= 0 ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
    } catch {
      stakeOut(-plan.stake); // no price data for this window: refund its stake
    }
    if (finished.current.length === plan.count) {
      setTimeout(() => (scored.current.length ? onDone(scored.current) : onAbort()), 400);
    }
  };

  const idx = Math.min(Math.floor((now - plan.startedAt) / (WINDOW * 1000)), plan.count - 1);
  const w = wins.current[idx];
  const elapsed = Math.min((now - (plan.startedAt + idx * WINDOW * 1000)) / 1000, WINDOW);
  const partial = w.partial();
  let carry: number | undefined;
  const shown = partial.map((v, i) => {
    if (v !== undefined) carry = v;
    return i <= Math.floor(elapsed) ? carry : undefined;
  });
  const last = [...shown].reverse().find((v) => v !== undefined);
  const first = shown.find((v) => v !== undefined);
  const delta = last !== undefined && first !== undefined ? last - first : 0;
  const left = Math.max(0, Math.ceil(WINDOW - elapsed));

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderWidth: 2, borderColor: C.lime, borderRadius: 12, backgroundColor: fade(C.bg, 0.6), marginBottom: 12 }}>
        <Text style={{ fontSize: 18 }}>🎯</Text>
        <Text style={{ color: C.lime, fontFamily: F.bold, fontSize: 14 }}>
          {left === 0 ? "Awaiting settlement... crunching the future lines" : MESSAGES[msgI]}
          {left > 0 && <Text style={{ color: fade(C.lime, 0.8), fontSize: 12 }}>  ({left}s left)</Text>}
        </Text>
      </View>

      <NeoBox shadow={6} radius={16} innerStyle={{ padding: 10, overflow: "hidden" }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
          <View>
            <Text style={{ color: fade(C.lime, 0.7), fontFamily: F.bold, fontSize: 11 }}>{ASSET}/USDT · {plan.leverage}x · {money(plan.stake)} ink</Text>
            <Text style={{ color: delta >= 0 ? C.green : "#FCA5A5", fontFamily: F.mono, fontSize: 26, fontWeight: "700" }}>{last ? `$${money(last)}` : "…"}</Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Venite size={46} off={3}>{String(left)}</Venite>
            <Text style={{ color: fade(C.lime, 0.7), fontFamily: F.bold, fontSize: 11 }}>Position {idx + 1}/{plan.count}</Text>
          </View>
        </View>
        <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ marginTop: 6 }}>
          <PriceChart width={width} height={290} series={shown} slots={WINDOW} overlay={plan.predicted} />
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: 8 }}>
          <Text style={{ color: C.lime, fontFamily: F.bold, fontSize: 12 }}>┄ your drawing</Text>
          <Text style={{ color: C.white, fontFamily: F.bold, fontSize: 12 }}>🌈 real price</Text>
        </View>
      </NeoBox>
      <Text style={{ color: fade(C.white, 0.55), fontFamily: F.regular, fontSize: 12, textAlign: "center", marginTop: 16 }}>
        {plan.commitSig ? "Drawing sealed on Solana before this round started." : "Practice round: not sealed on-chain."}
      </Text>
    </View>
  );
}
