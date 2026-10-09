import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Easing, PanResponder, StyleSheet, Text, View } from "react-native";
import * as Haptics from "expo-haptics";
import { C, F } from "./theme";

const CH = 36;
const POOL = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const STRIP = 16;

function Reel({ target, spinning, duration, delay }: { target: string; spinning: boolean; duration: number; delay: number }) {
  const strip = useMemo(() => {
    const s = Array.from({ length: STRIP - 1 }, () => POOL[Math.floor(Math.random() * POOL.length)]);
    return [...s, target.toUpperCase()];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, spinning]);
  const y = useRef(new Animated.Value(-(STRIP - 1) * CH)).current;
  useEffect(() => {
    if (!spinning) {
      y.setValue(-(STRIP - 1) * CH);
      return;
    }
    y.setValue(0);
    Animated.timing(y, { toValue: -(STRIP - 1) * CH, duration, delay, easing: Easing.bezier(0.1, 0, 0.1, 1), useNativeDriver: true }).start();
  }, [spinning, duration, delay, y]);
  return (
    <View style={s.reel}>
      <Animated.View style={{ transform: [{ translateY: y }] }}>
        {strip.map((c, i) => (
          <View key={i} style={s.face}>
            <Text style={s.faceText}>{c}</Text>
          </View>
        ))}
      </Animated.View>
    </View>
  );
}

export function SlotText({ text, spinning, duration = 1200 }: { text: string; spinning: boolean; duration?: number }) {
  const chars = text.split("");
  return (
    <View style={s.text}>
      {chars.map((c, i) => (
        <React.Fragment key={i}>
          <Reel target={c} spinning={spinning} duration={duration} delay={i * 150} />
          {i < chars.length - 1 && <View style={s.fence} />}
        </React.Fragment>
      ))}
    </View>
  );
}

/**
 * Slot-machine lever. On a phone the ball is dragged down (or tapped); the reels
 * spin and `onPull` fires when they land, as in the web original.
 */
export function SlotLever({ text, onPull, disabled }: { text: string; onPull: () => void; disabled?: boolean }) {
  const [spinning, setSpinning] = useState(false);
  const drop = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);
  const cb = useRef(onPull);
  cb.current = onPull;
  const off = useRef(disabled);
  off.current = disabled;

  const pull = () => {
    if (off.current || busy.current) return;
    busy.current = true;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    setSpinning(true);
    Animated.sequence([
      Animated.timing(drop, { toValue: 1, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(drop, { toValue: 0, duration: 420, easing: Easing.bezier(0.68, -0.55, 0.265, 1.55), useNativeDriver: false }),
    ]).start();
    setTimeout(() => {
      setSpinning(false);
      busy.current = false;
      cb.current();
    }, 1500);
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !off.current,
      onPanResponderRelease: (_e, g) => {
        if (g.dy > 16 || (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6)) pull();
      },
    })
  ).current;

  const ballTop = drop.interpolate({ inputRange: [0, 1], outputRange: [2, 40] });
  const stickH = drop.interpolate({ inputRange: [0, 1], outputRange: [40, 20] });
  const stickTop = drop.interpolate({ inputRange: [0, 1], outputRange: [28, 48] });

  return (
    <View style={[s.wrap, disabled && { opacity: 0.5 }]}>
      <View style={s.body}>
        <View style={s.window}>
          <SlotText text={text} spinning={spinning} />
        </View>
      </View>
      <View style={s.lever} {...pan.panHandlers}>
        <View style={s.base} />
        <Animated.View style={[s.stick, { top: stickTop, height: stickH }]} />
        <Animated.View style={[s.ball, { top: ballTop }]} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { height: 104, flex: 1, justifyContent: "flex-end" },
  body: { height: 58, borderWidth: 3, borderColor: C.lime, borderRadius: 10, backgroundColor: C.bg, padding: 6, paddingRight: 44, marginBottom: 4, marginRight: 4, shadowColor: C.purple, elevation: 0, borderBottomWidth: 6, borderRightWidth: 7, borderBottomColor: C.purple, borderRightColor: C.purple },
  window: { flex: 1, borderWidth: 2, borderColor: C.lime, borderRadius: 6, backgroundColor: C.purple, overflow: "hidden" },
  text: { flex: 1, flexDirection: "row", alignItems: "center", backgroundColor: C.bg },
  reel: { flex: 1, height: CH, overflow: "hidden", alignItems: "center" },
  face: { height: CH, width: "100%", alignItems: "center", justifyContent: "center", backgroundColor: C.purple },
  faceText: { color: C.lime, fontFamily: F.mono, fontWeight: "700", fontSize: 20, textShadowColor: "rgba(193,255,114,0.5)", textShadowRadius: 8 },
  fence: { width: 3, alignSelf: "stretch", backgroundColor: C.lime },
  lever: { position: "absolute", right: 0, top: 0, bottom: 0, width: 56 },
  base: { position: "absolute", right: 14, top: 66, width: 26, height: 12, borderWidth: 3, borderColor: C.lime, borderLeftWidth: 0, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: C.purple },
  stick: { position: "absolute", right: 20, width: 12, borderWidth: 3, borderColor: C.lime, borderRadius: 6, backgroundColor: C.purple },
  ball: { position: "absolute", right: 12, width: 30, height: 30, borderWidth: 3, borderColor: C.bg, borderRadius: 7, backgroundColor: C.lime, shadowColor: C.lime, elevation: 8 },
});
