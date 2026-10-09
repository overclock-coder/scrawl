import React, { useEffect, useState } from "react";
import { Image, View } from "react-native";
import Svg, { G, Path } from "react-native-svg";
import { RAINBOW } from "./theme";

const CAT_W = 214;
const CAT_H = 134;

/** Pixel Nyan Cat sprite; two bob frames stand in for the web's six-frame CSS run cycle. */
export function NyanCat({ x, y, scale = 0.5 }: { x: number; y: number; scale?: number }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setF((n) => (n + 1) % 2), 150);
    return () => clearInterval(t);
  }, []);
  const w = CAT_W * scale;
  const h = CAT_H * scale;
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: x - w * 0.22, top: y - h * 0.62 + (f ? -2 : 2), width: w, height: h }}>
      <Image source={require("../../assets/ui/nyan.png")} style={{ width: w, height: h }} resizeMode="stretch" />
    </View>
  );
}

/** Six-band rainbow along a path with the original's two-step wave. */
export function RainbowTrail({ pts, width, height, thickness = 14 }: { pts: { x: number; y: number }[]; width: number; height: number; thickness?: number }) {
  const [wave, setWave] = useState(false);
  useEffect(() => {
    const t = setInterval(() => setWave((w) => !w), 175);
    return () => clearInterval(t);
  }, []);
  if (pts.length < 2) return null;
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const band = thickness / 6;
  const bob = wave ? 2.5 : -2.5;
  return (
    <Svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }} pointerEvents="none">
      <G transform={`translate(0 ${bob})`}>
        {RAINBOW.map((c, i) => (
          <Path key={c} d={d} stroke={c} strokeWidth={band + 0.6} fill="none" strokeLinecap="square" strokeLinejoin="round" transform={`translate(0 ${(i - 2.5) * band})`} />
        ))}
      </G>
    </Svg>
  );
}
