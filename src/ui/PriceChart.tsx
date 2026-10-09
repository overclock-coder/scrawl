import React from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { NyanCat, RainbowTrail } from "./Nyan";
import { C, fade } from "./theme";

interface Props {
  width: number;
  height: number;
  /** One value per slot; undefined = not seen yet. */
  series: (number | undefined)[];
  slots?: number;
  /** Drawing overlay (same slots). It is shifted to start where the real price started. */
  overlay?: number[];
  cat?: boolean;
  catScale?: number;
}

export function PriceChart({ width, height, series, slots = series.length, overlay, cat = true, catScale = 0.42 }: Props) {
  const first = series.find((v) => v !== undefined);
  const shift = overlay && first !== undefined ? first - overlay[0] : 0;
  const ov = overlay?.map((p) => p + shift);
  const seen = series.filter((v): v is number => v !== undefined);
  const vals = [...seen, ...(ov ?? [])];
  const padX = 10;
  const rightPad = cat ? 214 * catScale * 0.78 : 10;
  if (vals.length === 0) return <View style={{ width, height }} />;
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  const spread = Math.max(hi - lo, Math.abs(hi) * 0.00008);
  lo -= spread * 0.18;
  hi += spread * 0.18;
  const x = (i: number) => padX + (i / Math.max(slots - 1, 1)) * (width - padX - rightPad);
  const y = (v: number) => height - 14 - ((v - lo) / (hi - lo)) * (height - 28);

  const pts: { x: number; y: number }[] = [];
  series.forEach((v, i) => v !== undefined && pts.push({ x: x(i), y: y(v) }));
  const head = pts[pts.length - 1];
  const ovPath = ov?.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {[0.2, 0.4, 0.6, 0.8].map((f) => (
          <Line key={f} x1={0} x2={width} y1={height * f} y2={height * f} stroke={fade(C.lime, 0.1)} strokeDasharray="3 6" />
        ))}
        {ovPath && <Path d={ovPath} stroke={C.lime} strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" fill="none" opacity={0.95} />}
        {!cat && pts.length > 1 && (
          <Path d={pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")} stroke={C.lime} strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
        {!cat && head && <Circle cx={head.x} cy={head.y} r={5} fill={C.lime} />}
      </Svg>
      {cat && pts.length > 1 && <RainbowTrail pts={pts} width={width} height={height} thickness={12} />}
      {cat && head && <NyanCat x={head.x} y={head.y} scale={catScale} />}
    </View>
  );
}
