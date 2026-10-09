import React, { useState } from "react";
import { Image, Pressable, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { C, F, fade } from "./theme";

/** The web UI's `box-shadow: Npx Npx 0 0 colour` has no Android equivalent, so draw it as a layer. */
export function NeoBox({
  children,
  bg = C.bg,
  border = C.lime,
  borderWidth = 4,
  radius = 16,
  shadow = 6,
  shadowColor = C.purple,
  style,
  innerStyle,
}: {
  children?: React.ReactNode;
  bg?: string;
  border?: string;
  borderWidth?: number;
  radius?: number;
  shadow?: number;
  shadowColor?: string;
  style?: StyleProp<ViewStyle>;
  innerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{ marginRight: shadow, marginBottom: shadow }, style]}>
      <View
        pointerEvents="none"
        style={{ position: "absolute", top: shadow, left: shadow, right: -shadow, bottom: -shadow, backgroundColor: shadowColor, borderRadius: radius }}
      />
      <View style={[{ backgroundColor: C.bg, borderColor: border, borderWidth, borderRadius: radius }, innerStyle, { overflow: "hidden" }]}>
        <View pointerEvents="none" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: bg }} />
        {children}
      </View>
    </View>
  );
}

/** Pressable that sinks into its shadow, like the web `whileTap={{ x: 2, y: 2 }}`. */
export function NeoButton({
  title,
  onPress,
  kind = "primary",
  disabled,
  small,
  left,
  style,
  textStyle,
}: {
  title: string;
  onPress: () => void;
  kind?: "primary" | "dark" | "light" | "danger";
  disabled?: boolean;
  small?: boolean;
  left?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}) {
  const [down, setDown] = useState(false);
  const v = {
    primary: { bg: C.lime, fg: C.purple, border: C.bg, shadow: C.bg },
    dark: { bg: C.purple, fg: C.lime, border: C.lime, shadow: C.lime },
    light: { bg: C.lime, fg: C.purple, border: C.purple, shadow: C.bg },
    danger: { bg: "#EF4444", fg: C.white, border: C.bg, shadow: C.bg },
  }[kind];
  const off = down ? 1 : small ? 3 : 5;
  return (
    <Pressable
      disabled={disabled}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      style={[disabled && { opacity: 0.4 }, style]}
    >
      <NeoBox bg={v.bg} border={v.border} borderWidth={small ? 3 : 4} radius={small ? 10 : 14} shadow={off} shadowColor={v.shadow} style={{ transform: [{ translateX: down ? 4 : 0 }, { translateY: down ? 4 : 0 }] }}
        innerStyle={{ paddingVertical: small ? 8 : 14, paddingHorizontal: small ? 12 : 22, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 }}>
        {left}
        <Text style={[{ color: v.fg, fontFamily: F.black, fontSize: small ? 12 : 17, letterSpacing: small ? 0.5 : 0.3 }, textStyle]}>{title}</Text>
      </NeoBox>
    </Pressable>
  );
}

export const PixelImg = ({ source, size, style }: { source: number; size: number; style?: StyleProp<ViewStyle> }) => (
  <Image source={source} style={[{ width: size, height: size }, style as object]} resizeMode="contain" resizeMethod="scale" />
);

/** Venite headline with the web's hard text-shadow. */
export function Venite({ children, size = 28, color = C.lime, shadow = C.purple, off = 3, style }: { children: React.ReactNode; size?: number; color?: string; shadow?: string; off?: number; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[{ fontFamily: F.venite, fontSize: size, color, textShadowColor: shadow, textShadowOffset: { width: off, height: off }, textShadowRadius: 0 }, style]}>{children}</Text>
  );
}

/** Page background from the web CSS: 135deg #0a0014 -> #1800AD -> #0a0014. */
export function Backdrop({ children, noise }: { children: React.ReactNode; noise?: number }) {
  return (
    <LinearGradient colors={[C.bg, C.purple, C.bg]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ flex: 1 }}>
      {children}
      {noise ? <Noise opacity={noise} /> : null}
    </LinearGradient>
  );
}

/** The web page's grain overlay does not tile on Android's Image, so it is intentionally a no-op. */
export function Noise(_: { opacity?: number }) {
  return null;
}

export function Chipbadge({ text, bg = C.lime, fg = C.purple, border = C.purple }: { text: string; bg?: string; fg?: string; border?: string }) {
  return (
    <View style={{ backgroundColor: bg, borderColor: border, borderWidth: 2, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={{ color: fg, fontFamily: F.black, fontSize: 10 }}>{text}</Text>
    </View>
  );
}
