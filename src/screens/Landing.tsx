import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { ASSET, CLUSTER } from "../config";
import { money, useFeed } from "../ui/hooks";
import { NeoBox, NeoButton, Venite } from "../ui/neo";
import { NyanCat, RainbowTrail } from "../ui/Nyan";
import { C, F, fade } from "../ui/theme";

const STEPS = [
  { n: "1", emoji: "✏️", title: "Draw", desc: "Sketch where you think the price goes over the next minute." },
  { n: "2", emoji: "🔒", title: "Seal", desc: "Your line is hashed and your stake is escrowed on Solana before the clock starts." },
  { n: "3", emoji: "💰", title: "Score", desc: "Every second's move is compared with your line. Call the direction right more often than not and you profit." },
];

export function Landing({ onPlay, onBoard }: { onPlay: () => void; onBoard: () => void }) {
  const { width } = useWindowDimensions();
  const { price, status } = useFeed();
  const scroll = useRef<ScrollView>(null);
  const [howY, setHowY] = useState(0);
  const [step, setStep] = useState(0);
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: 6, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(bob, { toValue: -6, duration: 1400, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    l.start();
    return () => l.stop();
  }, [bob]);

  const live = status === "live" && price != null;
  const stripW = width - 32;
  const cardW = width - 56;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView ref={scroll} contentContainerStyle={{ paddingTop: 28, paddingBottom: 8 }} showsVerticalScrollIndicator={false}>
        {/* Top bar */}
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Venite size={26} off={3} style={{ letterSpacing: 5 }}>SCRAWL</Venite>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, borderColor: C.lime, borderWidth: 2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
            <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: C.lime }} />
            <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 10, letterSpacing: 1 }}>{CLUSTER.toUpperCase()}</Text>
          </View>
        </View>

        {/* Hero card */}
        <View style={{ paddingHorizontal: 16, marginTop: 22 }}>
          <NeoBox shadow={7} shadowColor={C.lime} border={C.lime} radius={22} bg={fade(C.purple, 0.55)} innerStyle={{ alignItems: "center", paddingTop: 22, paddingBottom: 18, paddingHorizontal: 16 }}>
            <View style={{ shadowColor: C.lime, elevation: 22, borderRadius: 22 }}>
              <Image source={require("../../assets/ui/logo.png")} style={{ width: 150, height: 150, borderRadius: 22, borderWidth: 3, borderColor: C.lime }} />
            </View>
            <Venite size={28} off={3} style={{ marginTop: 18, textAlign: "center" }}>Draw your futures</Venite>
            <Text style={{ color: fade(C.white, 0.85), fontFamily: F.regular, fontSize: 14, textAlign: "center", marginTop: 8, lineHeight: 21 }}>
              Sketch the next 60 seconds of {ASSET}. Call the direction right and get paid.
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", alignSelf: "stretch", marginTop: 16, backgroundColor: C.bg, borderRadius: 12, borderWidth: 2, borderColor: fade(C.lime, 0.5), paddingHorizontal: 12, paddingVertical: 10 }}>
              <View>
                <Text style={{ color: fade(C.lime, 0.7), fontFamily: F.bold, fontSize: 10 }}>{ASSET}/USDT</Text>
                <Text style={{ color: C.white, fontFamily: F.mono, fontSize: 14, marginTop: 6 }}>{live ? `$${money(price as number)}` : "…"}</Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: live ? C.lime : C.gold, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.purple }} />
                <Text style={{ color: C.purple, fontFamily: F.black, fontSize: 10, letterSpacing: 1 }}>{live ? "LIVE" : "WAIT"}</Text>
              </View>
            </View>
          </NeoBox>
        </View>

        {/* Actions */}
        <View style={{ paddingHorizontal: 16, marginTop: 20, gap: 14 }}>
          <NeoButton title="PLAY NOW" onPress={onPlay} kind="primary" textStyle={{ fontSize: 22, letterSpacing: 2 }} style={{ width: "100%" }} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <NeoButton kind="dark" small title="🏆 Leaderboard" onPress={onBoard} style={{ flex: 1 }} />
            <NeoButton kind="dark" small title="How it works ↓" onPress={() => scroll.current?.scrollTo({ y: howY - 8, animated: true })} style={{ flex: 1 }} />
          </View>
        </View>

        {/* Running cat strip */}
        <Animated.View style={{ width: stripW, height: 74, alignSelf: "center", marginTop: 22, transform: [{ translateY: bob }] }}>
          <RainbowTrail pts={[{ x: 0, y: 40 }, { x: stripW * 0.62, y: 40 }]} width={stripW} height={74} thickness={20} />
          <NyanCat x={stripW * 0.62} y={40} scale={0.55} />
        </Animated.View>

        {/* How it works: swipeable cards */}
        <View onLayout={(e) => setHowY(e.nativeEvent.layout.y)} style={{ marginTop: 18, paddingVertical: 26, borderTopWidth: 4, borderBottomWidth: 4, borderColor: C.lime, backgroundColor: fade(C.bg, 0.85) }}>
          <Venite size={22} off={2} style={{ textAlign: "center", marginBottom: 16 }}>How it works</Venite>
          <ScrollView
            horizontal
            pagingEnabled={false}
            snapToInterval={cardW + 12}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
            onScroll={(e) => setStep(Math.min(STEPS.length - 1, Math.round(e.nativeEvent.contentOffset.x / (cardW + 12))))}
            scrollEventThrottle={32}
          >
            {STEPS.map((s) => (
              <View key={s.n} style={{ width: cardW }}>
                <NeoBox bg={fade(C.purple, 0.6)} border={C.lime} shadow={5} shadowColor={C.lime} radius={18} innerStyle={{ padding: 18, minHeight: 170 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <Text style={{ fontSize: 34 }}>{s.emoji}</Text>
                    <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 20 }}>{s.n}. {s.title}</Text>
                  </View>
                  <Text style={{ color: fade(C.white, 0.85), fontFamily: F.regular, fontSize: 14, lineHeight: 21, marginTop: 10 }}>{s.desc}</Text>
                </NeoBox>
              </View>
            ))}
          </ScrollView>
          <View style={{ flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 14 }}>
            {STEPS.map((s, i) => (
              <View key={s.n} style={{ width: i === step ? 22 : 8, height: 8, borderRadius: 4, backgroundColor: i === step ? C.lime : fade(C.lime, 0.35) }} />
            ))}
          </View>
        </View>

        <View style={{ padding: 22, alignItems: "center", gap: 4 }}>
          <Text style={{ color: fade(C.lime, 0.7), fontFamily: F.regular, fontSize: 12 }}>Built with 🐱 on Solana · devnet only, no real funds</Text>
        </View>
      </ScrollView>
    </View>
  );
}
