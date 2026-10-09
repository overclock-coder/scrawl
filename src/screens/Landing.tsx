import React, { useEffect, useRef } from "react";
import { Animated, Easing, Image, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { NeoBox, NeoButton, Noise, Venite } from "../ui/neo";
import { NyanCat, RainbowTrail } from "../ui/Nyan";
import { C, F, fade } from "../ui/theme";

const STEPS = [
  { n: "1", emoji: "✏️", title: "Draw Your Prediction", desc: "You're shown a live market chart. Draw a path representing your expected price trajectory over the next minute." },
  { n: "2", emoji: "🔒", title: "Seal It On Solana", desc: "Your drawing is sampled to 60 points, hashed and signed with your wallet through Mobile Wallet Adapter before the clock starts." },
  { n: "3", emoji: "💰", title: "Calculate PnL", desc: "Each second's move is compared with your line. Call the direction right more often than not and you profit." },
];

export function Landing({ onPlay, onBoard }: { onPlay: () => void; onBoard: () => void }) {
  const { width } = useWindowDimensions();
  const bob = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const l = Animated.loop(Animated.sequence([Animated.timing(bob, { toValue: 10, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true }), Animated.timing(bob, { toValue: -10, duration: 1500, easing: Easing.inOut(Easing.quad), useNativeDriver: true })]));
    l.start();
    return () => l.stop();
  }, [bob]);
  const heroW = width - 32;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: 36 }} showsVerticalScrollIndicator={false}>
        <View style={{ paddingHorizontal: 16, alignItems: "center" }}>
          <View style={{ shadowColor: C.lime, elevation: 18, borderRadius: 14 }}>
            <Image source={require("../../assets/ui/logo.png")} style={{ width: 88, height: 88, borderRadius: 14 }} />
          </View>
          <Venite size={44} off={4} shadow={C.purple} style={{ letterSpacing: 8, marginTop: 14 }}>SCRAWL</Venite>
          <Text style={{ color: C.white, fontFamily: F.black, fontSize: 21, textAlign: "center", marginTop: 22, lineHeight: 28 }}>
            We&apos;ve invented a new way to trade futures.{"\n"}
            <Text style={{ color: C.lime }}>Draw your futures.</Text>
          </Text>
          <Text style={{ color: fade(C.white, 0.8), fontFamily: F.regular, fontSize: 14, textAlign: "center", marginTop: 12, lineHeight: 21 }}>
            A trading game where <Text style={{ color: C.lime, fontFamily: F.bold }}>futures trades are expressed as drawings</Text>, not orders. Turn your market intuition into entertainment finance, signed from your Solana wallet.
          </Text>

          <View style={{ width: "100%", gap: 14, marginTop: 24 }}>
            <NeoButton kind="dark" title="Play Now" onPress={onPlay} textStyle={{ fontSize: 19 }} style={{ width: "100%" }} />
            <NeoButton kind="light" title="🏆 Leaderboard" onPress={onBoard} style={{ width: "100%" }} />
          </View>

          <Animated.View style={{ width: heroW, height: 130, marginTop: 20, transform: [{ translateY: bob }] }}>
            <RainbowTrail pts={[{ x: 0, y: 70 }, { x: heroW * 0.55, y: 70 }]} width={heroW} height={130} thickness={30} />
            <NyanCat x={heroW * 0.55} y={70} scale={0.95} />
          </Animated.View>
        </View>

        <View style={{ backgroundColor: fade(C.bg, 0.82), borderTopWidth: 4, borderBottomWidth: 4, borderColor: C.lime, paddingVertical: 34, paddingHorizontal: 16, marginTop: 14 }}>
          <Venite size={30} off={3} style={{ textAlign: "center", marginBottom: 24 }}>How It Works?</Venite>
          <View style={{ gap: 20 }}>
            {STEPS.map((s) => (
              <NeoBox key={s.n} bg={fade(C.purple, 0.6)} border={C.lime} shadow={6} shadowColor={C.lime} radius={18} innerStyle={{ padding: 20 }}>
                <Text style={{ fontSize: 52 }}>{s.emoji}</Text>
                <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 18, marginTop: 6, marginBottom: 6 }}>{s.n}. {s.title}</Text>
                <Text style={{ color: fade(C.white, 0.8), fontFamily: F.regular, fontSize: 14, lineHeight: 21 }}>{s.desc}</Text>
              </NeoBox>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: fade(C.purple, 0.6), paddingVertical: 38, paddingHorizontal: 16, alignItems: "center" }}>
          <Venite size={26} off={3} shadow={C.bg} style={{ textAlign: "center" }}>Ready to trade convictions?</Venite>
          <Text style={{ color: fade(C.white, 0.8), fontFamily: F.regular, fontSize: 15, textAlign: "center", marginVertical: 16 }}>
            Draw your prediction curve and turn your market intuition into trading decisions.
          </Text>
          <NeoButton title="Play Now 🚀" onPress={onPlay} textStyle={{ fontSize: 20 }} />
        </View>

        <View style={{ backgroundColor: C.purple, borderTopWidth: 4, borderTopColor: C.lime, padding: 22, alignItems: "center", gap: 6 }}>
          <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 17, letterSpacing: 3 }}>SCRAWL</Text>
          <Text style={{ color: fade(C.lime, 0.6), fontFamily: F.regular, fontSize: 12 }}>Draw Your Futures</Text>
          <Text style={{ color: fade(C.lime, 0.6), fontFamily: F.regular, fontSize: 12, marginTop: 6 }}>Built with 🐱 on Solana</Text>
        </View>
      </ScrollView>
      <Noise opacity={0.12} />
    </View>
  );
}
