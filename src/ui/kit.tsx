import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { C, R } from "./theme";

export function Chip({ label, on, onPress, disabled }: { label: string; on: boolean; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable
      disabled={disabled}
      onPress={() => {
        Haptics.selectionAsync().catch(() => {});
        onPress();
      }}
      style={[k.chip, on && { backgroundColor: C.accent, borderColor: C.accent }, disabled && { opacity: 0.4 }]}
    >
      <Text style={[k.chipText, on && { color: "#0B0B10" }]}>{label}</Text>
    </Pressable>
  );
}

export function Button({
  title,
  onPress,
  busy,
  disabled,
  kind = "primary",
  style,
}: {
  title: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  kind?: "primary" | "ghost";
  style?: ViewStyle;
}) {
  const primary = kind === "primary";
  return (
    <Pressable
      disabled={disabled || busy}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        onPress();
      }}
      style={[k.btn, primary ? { backgroundColor: C.accent } : { borderWidth: 1, borderColor: C.line }, (disabled || busy) && { opacity: 0.45 }, style]}
    >
      {busy ? <ActivityIndicator color={primary ? "#0B0B10" : C.text} /> : <Text style={[k.btnText, !primary && { color: C.text }]}>{title}</Text>}
    </Pressable>
  );
}

export function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={k.stat}>
      <Text style={k.statLabel}>{label}</Text>
      <Text style={[k.statValue, color ? { color } : null]}>{value}</Text>
    </View>
  );
}

export const k = StyleSheet.create({
  chip: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: R.pill, borderWidth: 1, borderColor: C.line, backgroundColor: C.card },
  chipText: { color: C.text, fontWeight: "700" },
  btn: { height: 56, borderRadius: R.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  btnText: { color: "#0B0B10", fontWeight: "800", fontSize: 17 },
  stat: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.line },
  statLabel: { color: C.dim, fontSize: 12, marginBottom: 4 },
  statValue: { color: C.text, fontSize: 20, fontWeight: "800" },
});
