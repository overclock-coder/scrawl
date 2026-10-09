import React, { useEffect, useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as Haptics from "expo-haptics";
import { ASSET, BAND_PCT, MIN_STAKE_SOL, POSITION_RENT_SOL } from "../config";
import { commitMemo, hashPrices } from "../logic/commit";
import { commitmentBytes } from "../logic/onchain";
import { MIN_COVERAGE, coverage, strokeToPrices } from "../logic/sampling";
import { MAX_LEVERAGE } from "../logic/scoring";
import { Point } from "../logic/types";
import { classifyWalletError } from "../logic/walletErrors";
import { feed } from "../services/priceFeed";
import { registerDrawing, settlerOnline } from "../services/settler";
import { confirm, openPositions, sendMemo } from "../solana/wallet";
import { useStore } from "../state/store";
import { BottomControls } from "../ui/Bars";
import { DrawPad, PAD_HEIGHT } from "../ui/DrawPad";
import { fmtAmount, money, useFeed, useSeries, useSol } from "../ui/hooks";
import { Chipbadge, NeoBox, Venite } from "../ui/neo";
import { PriceChart } from "../ui/PriceChart";
import { SlotLever } from "../ui/SlotLever";
import { C, F, fade } from "../ui/theme";

export interface RoundPlan {
  predicted: number[];
  /** Stake per position. */
  stake: number;
  /** Number of back-to-back 60s positions (the 1-5 min horizon). */
  count: number;
  leverage: number;
  startPrice: number;
  commitHash: string;
  commitSig?: string;
  startedAt: number;
  /** Present when staked with devnet SOL: one on-chain position per minute. */
  live?: { positions: string[] };
}

const CHIPS = [
  require("../../assets/ui/chip-1.png"),
  require("../../assets/ui/chip-2.png"),
  require("../../assets/ui/chip-3.png"),
  require("../../assets/ui/chip-4.png"),
  require("../../assets/ui/chip-5.png"),
];
const LEVS = [5, 10, 25, 50, MAX_LEVERAGE];
const ZOOMS = [30, 60, 90, 120];

export function PlayScreen({ onStart }: { onStart: (p: RoundPlan) => void }) {
  const { balance, session, stakeOut, history } = useStore();
  const { price, status } = useFeed();
  const series = useSeries(120);
  const [zoom, setZoom] = useState(2);
  const [stroke, setStroke] = useState<Point[]>([]);
  const [padW, setPadW] = useState(300);
  const [chartW, setChartW] = useState(300);
  const [drawing, setDrawing] = useState(false);
  const [minutes, setMinutes] = useState(1);
  const [amount, setAmount] = useState("10");
  const [lev, setLev] = useState(10);
  const [levOpen, setLevOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [practice, setPractice] = useState(false);
  const { sol, refresh } = useSol(session?.address);

  const onchain = !!session && !practice;
  const stake = Math.max(0, Number(amount) || 0);
  const total = stake * minutes;
  const ready = coverage(stroke, padW) >= MIN_COVERAGE;
  const live = status === "live" && price != null;
  const minStake = onchain ? MIN_STAKE_SOL : 1;
  const overhead = onchain ? POSITION_RENT_SOL * minutes + 0.001 : 0;
  const funds = onchain ? (sol ?? 0) : balance;
  const affordable = total + overhead <= funds;
  const canGo = ready && live && stake >= minStake && affordable && !busy;

  // The wallet session restores after first render, and the unit changes with the mode: reset the stake to a sane default.
  useEffect(() => {
    setAmount(onchain ? "0.02" : "10");
    setMsg(null);
  }, [onchain]);
  const lastPnl = history[0]?.score.pnl ?? null;

  const go = async () => {
    const startPrice = feed.last;
    if (!startPrice) return;
    setMsg(null);
    const predicted = strokeToPrices(stroke, padW, PAD_HEIGHT, startPrice, BAND_PCT);
    const commitHash = hashPrices(predicted);
    if (onchain) {
      setBusy(true);
      try {
        if (!(await settlerOnline())) throw new Error("The settler is offline, so rounds cannot be scored. Start it and retry.");
        const res = await openPositions({ count: minutes, stakeSol: stake, leverage: lev, commitment: commitmentBytes(predicted) });
        if (!(await confirm(res.signature))) throw new Error("The stake transaction failed on-chain.");
        await Promise.all(res.positions.map((pos) => registerDrawing(pos, predicted)));
        void refresh();
        setBusy(false);
        onStart({ predicted, stake, count: minutes, leverage: lev, startPrice, commitHash, commitSig: res.signature, startedAt: Date.now(), live: { positions: res.positions } });
        setStroke([]);
      } catch (e) {
        const c = classifyWalletError(e);
        setMsg(c.kind === "failed" && e instanceof Error ? e.message : c.message);
        setBusy(false);
      }
      return;
    }
    let commitSig: string | undefined;
    if (session) {
      setBusy(true);
      try {
        // The drawing is committed on-chain BEFORE the first 60s window begins.
        commitSig = (await sendMemo(commitMemo(commitHash, ASSET, lev, Date.now()))).signature;
      } catch (e) {
        setMsg(classifyWalletError(e).message);
        setBusy(false);
        return;
      }
      setBusy(false);
    }
    stakeOut(total);
    onStart({ predicted, stake, count: minutes, leverage: lev, startPrice, commitHash, commitSig, startedAt: Date.now() });
    setStroke([]);
  };

  const visible = series.slice(-ZOOMS[zoom]);
  const statusLine = !live ? "Connecting to the market…" : stake < minStake ? `Minimum stake is ${minStake}${onchain ? " SOL" : ""}` : !affordable ? (onchain ? "Not enough devnet SOL (stake + account rent)" : "Not enough SCP for that stake") : null;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 20 }} scrollEnabled={!drawing} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Main chart card */}
        <NeoBox shadow={6} radius={16} style={{ marginBottom: 12 }} innerStyle={{ overflow: "hidden", padding: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
            <View>
              <Text style={{ color: fade(C.lime, 0.7), fontFamily: F.bold, fontSize: 11 }}>{ASSET}/USDT</Text>
              <Text style={{ color: C.white, fontFamily: F.mono, fontSize: 15, marginTop: 6 }}>{price ? `$${money(price)}` : "…"}</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: live ? C.lime : C.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.purple }} />
              <Text style={{ color: C.purple, fontFamily: F.black, fontSize: 10, letterSpacing: 1 }}>{live ? "LIVE" : "WAIT"}</Text>
            </View>
          </View>
          <View onLayout={(e) => setChartW(e.nativeEvent.layout.width)}>
            <PriceChart width={chartW} height={150} series={visible} slots={visible.length} />
          </View>
        </NeoBox>

        {/* Pattern drawing box */}
        <NeoBox shadow={6} radius={16} innerStyle={{ padding: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <Venite size={19} off={2}>Draw your futures</Venite>
            {stroke.length > 0 && <Chipbadge text={`${stroke.length} pts`} border={C.purple} />}
          </View>
          <DrawPad stroke={stroke} onStroke={setStroke} onSize={setPadW} width={padW} onDrawing={setDrawing} />

          <Text style={{ color: fade(C.lime, 0.7), fontFamily: F.regular, fontSize: 13, marginTop: 12, marginBottom: 2 }}>Choose time horizon & resolve</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-between", marginVertical: 2 }}>
            {CHIPS.map((src, i) => {
              const on = minutes === i + 1;
              return (
                <Pressable key={i} onPress={() => { Haptics.selectionAsync().catch(() => {}); setMinutes(i + 1); }} style={{ opacity: on ? 1 : 0.65, transform: [{ scale: on ? 1.12 : 1 }], shadowColor: C.lime, elevation: on ? 12 : 0 }}>
                  <Image source={src} style={{ width: 58, height: 58 }} resizeMode="contain" />
                </Pressable>
              );
            })}
          </View>

          {session && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10 }}>
              {([[false, "◎ Devnet SOL"], [true, "Practice · SCP"]] as const).map(([p, label]) => (
                <Pressable key={label} onPress={() => setPractice(p)} style={{ flex: 1 }}>
                  <NeoBox bg={practice === p ? C.lime : C.purple} borderWidth={3} radius={10} shadow={3} shadowColor={practice === p ? C.purple : C.lime} innerStyle={{ paddingVertical: 8, alignItems: "center" }}>
                    <Text style={{ color: practice === p ? C.purple : C.lime, fontFamily: F.black, fontSize: 12 }}>{label}</Text>
                  </NeoBox>
                </Pressable>
              ))}
            </View>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10 }}>
            <NeoBox bg={C.purple} borderWidth={3} radius={12} shadow={3} shadowColor={C.lime} style={{ flex: 1 }} innerStyle={{ paddingHorizontal: 12, flexDirection: "row", alignItems: "center" }}>
              <TextInput
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ""))}
                keyboardType="numeric"
                style={{ flex: 1, color: C.lime, fontFamily: F.black, fontSize: 15, paddingVertical: 8 }}
                placeholder={onchain ? "0.02" : "10"}
                placeholderTextColor={fade(C.lime, 0.4)}
              />
              <Text style={{ color: fade(C.lime, 0.7), fontFamily: F.bold, fontSize: 11 }}>{onchain ? "SOL" : "SCP"}{minutes > 1 ? ` ×${minutes}` : ""}</Text>
            </NeoBox>
            <Pressable onPress={() => setLevOpen(true)}>
              <NeoBox bg={C.purple} borderWidth={3} radius={12} shadow={3} shadowColor={C.lime} innerStyle={{ paddingHorizontal: 14, paddingVertical: 11 }}>
                <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 15 }}>{lev}x ▾</Text>
              </NeoBox>
            </Pressable>
          </View>

          <View style={{ marginTop: 10 }}>
            <SlotLever text="SCRAWL" onPull={go} disabled={!canGo} />
          </View>
          <Text style={{ color: fade(C.lime, 0.6), fontFamily: F.regular, fontSize: 11, textAlign: "center", marginTop: 2 }}>
            {ready ? "Drag the lever down or tap the ball" : "Draw across the pad to arm the lever"}
          </Text>
        </NeoBox>

        {/* Status */}
        {(busy || msg || statusLine) && (
          <View style={{ marginTop: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 12, borderWidth: 2, borderColor: C.lime, borderRadius: 12, backgroundColor: fade(C.bg, 0.6) }}>
            <Text style={{ fontSize: 18 }}>🎯</Text>
            <Text style={{ color: msg ? C.gold : C.lime, fontFamily: F.bold, fontSize: 13, flexShrink: 1 }}>
              {busy ? (onchain ? "Approve the stake in your wallet…" : "Sealing your drawing in your wallet…") : msg ?? statusLine}
            </Text>
          </View>
        )}
        <Text style={{ color: fade(C.white, 0.5), fontFamily: F.regular, fontSize: 11, textAlign: "center", marginTop: 12, lineHeight: 16 }}>
          {onchain ? "Your stake is escrowed in the program on Solana devnet. The settler scores the round and pays out." : session ? "Practice mode: SCP only, drawing sealed with a memo." : "Connect a wallet (top right) to seal drawings on Solana. Without one, rounds are practice only."}
        </Text>
      </ScrollView>

      <BottomControls
        onZoomIn={() => setZoom((z) => Math.max(0, z - 1))}
        onZoomOut={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}
        balance={onchain ? (sol ?? 0) : balance}
        balanceText={onchain ? `${(sol ?? 0).toFixed(3)} SOL` : undefined}
        pnl={lastPnl}
        minutes={minutes}
        hasPoints={stroke.length > 0}
        onClear={() => setStroke([])}
      />

      <Modal visible={levOpen} transparent animationType="fade" onRequestClose={() => setLevOpen(false)}>
        <Pressable onPress={() => setLevOpen(false)} style={{ flex: 1, backgroundColor: "rgba(10,0,20,0.85)", justifyContent: "center", padding: 40 }}>
          <NeoBox shadow={8} innerStyle={{ padding: 14, gap: 10 }}>
            <Venite size={18} off={2}>Leverage</Venite>
            {LEVS.map((v) => (
              <Pressable key={v} onPress={() => { setLev(v); setLevOpen(false); }}>
                <NeoBox bg={v === lev ? C.lime : C.purple} border={C.lime} borderWidth={3} radius={10} shadow={3} shadowColor={v === lev ? C.purple : C.lime} innerStyle={{ paddingVertical: 10, alignItems: "center" }}>
                  <Text style={{ color: v === lev ? C.purple : C.lime, fontFamily: F.black, fontSize: 16 }}>{v}x</Text>
                </NeoBox>
              </Pressable>
            ))}
          </NeoBox>
        </Pressable>
      </Modal>
    </View>
  );
}
