import React from "react";
import { Image, Pressable, Text, View } from "react-native";
import { useStore } from "../state/store";
import { NeoBox, Chipbadge, Venite } from "./neo";
import { short } from "./hooks";
import { C, F, fade } from "./theme";

export function Header({ onWallet, status }: { onWallet: () => void; status?: string }) {
  const { session } = useStore();
  return (
    <View style={{ backgroundColor: fade(C.purple, 0.92), borderBottomWidth: 4, borderBottomColor: C.lime, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ shadowColor: C.lime, elevation: 10, borderRadius: 8 }}>
          <Image source={require("../../assets/ui/logo.png")} style={{ width: 42, height: 42, borderRadius: 8 }} />
        </View>
        <View>
          <Venite size={21} color={C.lime} shadow={C.bg} off={2} style={{ letterSpacing: 3 }}>SCRAWL</Venite>
          <Text style={{ fontFamily: F.bold, color: fade(C.lime, 0.7), fontSize: 9, letterSpacing: 1.2 }}>DRAW YOUR FUTURES</Text>
        </View>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        {status ? <Chipbadge text={`● ${status}`} bg={fade(C.lime, 0.2)} fg={C.lime} border={C.lime} /> : null}
        <Pressable onPress={onWallet}>
          <NeoBox bg={session ? C.purple : C.lime} border={session ? C.lime : C.bg} borderWidth={3} radius={9} shadow={4} shadowColor={session ? C.lime : C.bg} innerStyle={{ paddingHorizontal: 10, paddingVertical: 7, flexDirection: "row", alignItems: "center", gap: 6 }}>
            <View style={{ width: 16, height: 16, borderRadius: 3, borderWidth: 2, borderColor: session ? C.lime : C.purple, backgroundColor: session ? C.lime : C.purple, alignItems: "center", justifyContent: "center" }}>
              <View style={{ width: 6, height: 6, borderRadius: 1, backgroundColor: session ? C.purple : C.lime }} />
            </View>
            <View>
              <Text style={{ fontFamily: F.black, color: session ? C.lime : C.purple, fontSize: 11, letterSpacing: 0.6 }}>{session ? "CONNECTED" : "CONNECT"}</Text>
              {session && <Text style={{ fontFamily: F.venite, color: C.white, fontSize: 9 }}>{short(session.address)}</Text>}
            </View>
          </NeoBox>
        </Pressable>
      </View>
    </View>
  );
}
