import React, { useState } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { classifyWalletError } from "../logic/walletErrors";
import { useStore } from "../state/store";
import { connectWallet } from "../solana/wallet";
import { short } from "../ui/hooks";
import { C, R } from "../ui/theme";

export function WalletChip({ onPress }: { onPress?: () => void }) {
  const { session, setSession } = useStore();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const press = async () => {
    if (session) return onPress?.();
    setBusy(true);
    setErr(null);
    try {
      setSession(await connectWallet());
    } catch (e) {
      setErr(classifyWalletError(e).message);
    }
    setBusy(false);
  };

  return (
    <>
      <Pressable onPress={press} style={[s.chip, session && { borderColor: C.accent }]}>
        <Text style={[s.text, session && { color: C.accent }]}>{busy ? "Connecting…" : session ? short(session.address) : "Connect wallet"}</Text>
      </Pressable>
      {err && <Text style={s.err}>{err}</Text>}
    </>
  );
}

const s = StyleSheet.create({
  chip: { borderWidth: 1, borderColor: C.line, backgroundColor: C.card, paddingVertical: 10, paddingHorizontal: 14, borderRadius: R.pill },
  text: { color: C.text, fontWeight: "700" },
  err: { color: C.warn, fontSize: 11, marginTop: 4, maxWidth: 160 },
});
