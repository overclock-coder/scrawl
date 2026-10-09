import React from "react";
import Svg, { Line, Path, Circle } from "react-native-svg";
import { C } from "./theme";

interface Props {
  width: number;
  height: number;
  predicted: number[];
  actual: (number | undefined)[];
}

const path = (vals: (number | undefined)[], x: (i: number) => number, y: (v: number) => number) => {
  let d = "";
  vals.forEach((v, i) => {
    if (v === undefined) return;
    d += `${d ? "L" : "M"}${x(i).toFixed(1)} ${y(v).toFixed(1)} `;
  });
  return d;
};

/**
 * Predicted vs real prices. Only direction is scored, so the drawing is shifted to
 * start where the real price started; this keeps both lines in one readable frame.
 */
export function LineChart({ width, height, predicted, actual }: Props) {
  const first = actual.find((v) => v !== undefined);
  const shift = first !== undefined ? first - predicted[0] : 0;
  const pred = predicted.map((p) => p + shift);
  const seen = actual.filter((v): v is number => v !== undefined);
  const all = [...pred, ...seen];
  let lo = Math.min(...all);
  let hi = Math.max(...all);
  const pad = Math.max((hi - lo) * 0.12, 1e-9);
  lo -= pad;
  hi += pad;
  const x = (i: number) => (i / 59) * (width - 16) + 8;
  const y = (v: number) => height - 8 - ((v - lo) / (hi - lo)) * (height - 16);
  const lastIdx = actual.reduce<number>((m, v, i) => (v !== undefined ? i : m), -1);

  return (
    <Svg width={width} height={height}>
      <Line x1={0} x2={width} y1={height / 2} y2={height / 2} stroke={C.line} strokeDasharray="4 6" />
      <Path d={path(pred, x, y)} stroke={C.pred} strokeWidth={3} strokeDasharray="2 7" strokeLinecap="round" fill="none" opacity={0.9} />
      <Path d={path(actual, x, y)} stroke={C.accent} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      {lastIdx >= 0 && <Circle cx={x(lastIdx)} cy={y(actual[lastIdx] as number)} r={5} fill={C.accent} />}
    </Svg>
  );
}
