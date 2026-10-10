import React from "react";
import { Image, Linking, Pressable, ScrollView, Text, View } from "react-native";
import { CLUSTER, EXPLORER_ADDRESS } from "../config";
import { FUTURES_PROGRAM_ID } from "../logic/onchain";
import { short } from "../ui/hooks";
import { Backdrop, NeoBox, NeoButton, Venite } from "../ui/neo";
import { C, F, fade } from "../ui/theme";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const VERSION: string = require("../../package.json").version;

const STEPS = [
  ["1", "Draw", "Trace where you think SOL goes over the next 60 seconds."],
  ["2", "Stake", "Pick an amount and leverage. Your wallet approves once and the stake is escrowed on Solana."],
  ["3", "Score", "Each second's move is checked against your line. Call the direction right more than half the time and you profit."],
] as const;

const FACTS = [
  ["60s", "per position"],
  ["0.01", "SOL minimum"],
  ["100x", "top leverage"],
  ["2%", "fee, profit only"],
] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginTop: 22 }}>
      <Venite size={17} off={2} style={{ marginBottom: 10 }}>{title}</Venite>
      {children}
    </View>
  );
}

const P = ({ children }: { children: React.ReactNode }) => (
  <Text style={{ color: fade(C.white, 0.85), fontFamily: F.regular, fontSize: 14, lineHeight: 22 }}>{children}</Text>
);

export function AboutScreen({ onClose }: { onClose: () => void }) {
  return (
    <Backdrop>
      <View style={{ flex: 1, paddingTop: 36 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10 }}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Back">
            <NeoBox bg={C.purple} borderWidth={3} radius={10} shadow={3} shadowColor={C.lime} innerStyle={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 18 }}>←</Text>
            </NeoBox>
          </Pressable>
          <Text style={{ color: fade(C.lime, 0.8), fontFamily: F.mono, fontSize: 10, marginLeft: 16 }}>ABOUT</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          <View style={{ alignItems: "center", marginTop: 8 }}>
            <Image source={require("../../assets/ui/logo.png")} style={{ width: 104, height: 104, borderRadius: 18, borderWidth: 3, borderColor: C.lime }} />
            <Venite size={34} off={3} style={{ letterSpacing: 6, marginTop: 14 }}>SCRAWL</Venite>
            <Text style={{ color: C.white, fontFamily: F.black, fontSize: 15, marginTop: 6 }}>Draw your futures</Text>
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              {[`v${VERSION}`, CLUSTER.toUpperCase()].map((t) => (
                <View key={t} style={{ borderColor: C.lime, borderWidth: 2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: C.lime, fontFamily: F.mono, fontSize: 8 }}>{t}</Text>
                </View>
              ))}
            </View>
          </View>

          <Section title="What it is">
            <P>
              Scrawl is a small futures game for your phone. Instead of placing an order, you sketch the path you expect the SOL price to take over the next minute, stake on it, and get scored on how often your line moved the same way the market did.
            </P>
          </Section>

          <Section title="How a round works">
            <View style={{ gap: 12 }}>
              {STEPS.map(([n, h, b]) => (
                <NeoBox key={n} bg={fade(C.purple, 0.55)} shadow={4} shadowColor={C.lime} radius={14} innerStyle={{ padding: 14, flexDirection: "row", gap: 14 }}>
                  <Text style={{ color: C.lime, fontFamily: F.mono, fontSize: 16, width: 22 }}>{n}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: C.lime, fontFamily: F.black, fontSize: 15, marginBottom: 4 }}>{h}</Text>
                    <Text style={{ color: fade(C.white, 0.85), fontFamily: F.regular, fontSize: 13, lineHeight: 20 }}>{b}</Text>
                  </View>
                </NeoBox>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 }}>
              {FACTS.map(([big, small]) => (
                <View key={small} style={{ flexGrow: 1, flexBasis: "45%", borderColor: fade(C.lime, 0.5), borderWidth: 2, borderRadius: 12, padding: 12, backgroundColor: fade(C.bg, 0.6) }}>
                  <Text style={{ color: C.lime, fontFamily: F.mono, fontSize: 14 }}>{big}</Text>
                  <Text style={{ color: fade(C.white, 0.7), fontFamily: F.regular, fontSize: 12, marginTop: 8 }}>{small}</Text>
                </View>
              ))}
            </View>
          </Section>

          <Section title="On Solana">
            <P>
              Your stake is held by an on-chain program, not by the app. A settler service records the price second by second, scores your line and closes the position, and the payout comes back to your wallet.
            </P>
            <View style={{ marginTop: 14 }}>
              <NeoBox bg={fade(C.bg, 0.7)} shadow={4} shadowColor={C.purple} radius={14} innerStyle={{ padding: 14 }}>
                <Text style={{ color: fade(C.lime, 0.8), fontFamily: F.mono, fontSize: 8 }}>PROGRAM ({CLUSTER.toUpperCase()})</Text>
                <Text selectable style={{ color: C.white, fontFamily: F.mono, fontSize: 9, lineHeight: 16, marginTop: 10 }}>{FUTURES_PROGRAM_ID}</Text>
                <Text style={{ color: fade(C.white, 0.6), fontFamily: F.regular, fontSize: 12, marginTop: 8 }}>{short(FUTURES_PROGRAM_ID)}</Text>
              </NeoBox>
            </View>
            <View style={{ marginTop: 14 }}>
              <NeoButton kind="light" small title="View program on Explorer ↗" onPress={() => Linking.openURL(EXPLORER_ADDRESS(FUTURES_PROGRAM_ID))} />
            </View>
          </Section>

          <Section title="Good to know">
            <View style={{ gap: 10 }}>
              <P>This build runs on Solana devnet. Devnet SOL has no real value, so no real funds are at risk.</P>
              <P>Prices come from a public SOL/USDT exchange feed, and the settler that scores rounds is a single trusted key for now.</P>
              <P>Practice mode uses NYAN, a play currency kept on your phone. It is never real money.</P>
            </View>
          </Section>

          <Section title="Credits">
            <View style={{ gap: 10 }}>
              <P>Nyan Cat sprite by Chris Torres.</P>
              <P>Typefaces: Orbitron and Press Start 2P (SIL Open Font License), and Venite Adoremus for headlines.</P>
              <P>Built with Expo, React Native, Anchor and the Solana Mobile Wallet Adapter.</P>
            </View>
          </Section>

          <Text style={{ color: fade(C.lime, 0.7), fontFamily: F.regular, fontSize: 12, textAlign: "center", marginTop: 28 }}>
            Made for the Solana Mobile hackathon, Mobile track
          </Text>
        </ScrollView>
      </View>
    </Backdrop>
  );
}
