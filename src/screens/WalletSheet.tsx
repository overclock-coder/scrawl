import React, { useEffect, useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { classifyWalletError } from "../logic/walletErrors";
import { airdrop, connectWallet, disconnectWallet, getBalanceSol } from "../solana/wallet";
import { useStore } from "../state/store";
import { short } from "../ui/hooks";
import { NeoBox, NeoButton, Venite } from "../ui/neo";
import { C, F } from "../ui/theme";

/** Wallet connect / balance / faucet / disconnect, opened from the header button. */
export function WalletSheet({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { session, setSession } = useStore();
  const [sol, setSol] = useState<number | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !session) return setSol(null);
    getBalanceSol(session.address).then(setSol).catch(() => setSol(null));
  }, [visible, session]);

  const run = async (name: string, fn: () => Promise<void>) => {
    setBusy(name);
    setMsg(null);
    try {
      await fn();
    } catch (e) {
      setMsg(classifyWalletError(e).message);
    }
    setBusy(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(10,0,20,0.85)", justifyContent: "center", padding: 20 }}>
        <Pressable onPress={() => {}}>
          <NeoBox bg={C.bg} shadow={8} innerStyle={{ padding: 18 }}>
            <Venite size={22}>Wallet</Venite>
            {session ? (
              <>
                <Text style={{ color: C.white, fontFamily: F.mono, fontSize: 10, marginTop: 12 }}>{short(session.address)}</Text>
                <Text style={{ color: C.lime, fontFamily: F.bold, marginTop: 4 }}>Devnet: {sol == null ? "…" : `${sol.toFixed(3)} SOL`}</Text>
                <View style={{ gap: 12, marginTop: 16 }}>
                  <NeoButton kind="light" small title={busy === "drop" ? "Requesting…" : "Get 1 devnet SOL"} disabled={!!busy} onPress={() => run("drop", async () => { await airdrop(session.address); setSol(await getBalanceSol(session.address)); })} />
                  <NeoButton kind="danger" small title="Disconnect" disabled={!!busy} onPress={() => run("out", async () => { await disconnectWallet(); setSession(null); onClose(); })} />
                </View>
              </>
            ) : (
              <>
                <Text style={{ color: "rgba(255,255,255,0.75)", fontFamily: F.regular, marginTop: 10, lineHeight: 20 }}>
                  Connect with Mobile Wallet Adapter. Your drawing is sealed on Solana devnet before each round starts.
                </Text>
                <NeoButton title={busy === "in" ? "Opening wallet…" : "Connect wallet"} disabled={!!busy} style={{ marginTop: 16 }} onPress={() => run("in", async () => { setSession(await connectWallet()); })} />
              </>
            )}
            {msg && <Text style={{ color: C.gold, marginTop: 12, fontFamily: F.regular, fontSize: 12 }}>{msg}</Text>}
          </NeoBox>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
