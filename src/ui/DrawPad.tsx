import React, { useMemo, useRef, useState } from "react";
import { PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { appendPoint } from "../logic/sampling";
import { Point } from "../logic/types";
import { C, R } from "./theme";

export const PAD_HEIGHT = 280;

interface Props {
  stroke: Point[];
  onStroke: (s: Point[]) => void;
  onSize: (w: number) => void;
  width: number;
  onDrawing?: (drawing: boolean) => void;
}

export const toPath = (pts: Point[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

/** Finger-drawn prediction canvas. Strokes are forced left-to-right (see appendPoint). */
export function DrawPad({ stroke, onStroke, onSize, width, onDrawing }: Props) {
  const ref = useRef<Point[]>(stroke);
  ref.current = stroke;
  const widthRef = useRef(width);
  widthRef.current = width;
  const [active, setActive] = useState(false);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          setActive(true);
          onDrawing?.(true);
          Haptics.selectionAsync().catch(() => {});
          const { locationX: x, locationY: y } = e.nativeEvent;
          onStroke(appendPoint([], { x, y }, widthRef.current));
        },
        onPanResponderMove: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          const clampedY = Math.min(Math.max(y, 0), PAD_HEIGHT);
          const next = appendPoint(ref.current, { x, y: clampedY }, widthRef.current);
          if (next !== ref.current) onStroke(next);
        },
        onPanResponderRelease: () => {
          setActive(false);
          onDrawing?.(false);
        },
        onPanResponderTerminate: () => {
          setActive(false);
          onDrawing?.(false);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  return (
    <View style={s.pad} onLayout={(e) => onSize(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <Svg width={width} height={PAD_HEIGHT} pointerEvents="none">
        {[0.25, 0.5, 0.75].map((f) => (
          <Line key={f} x1={0} x2={width} y1={PAD_HEIGHT * f} y2={PAD_HEIGHT * f} stroke={C.line} strokeDasharray={f === 0.5 ? undefined : "4 6"} />
        ))}
        {stroke.length > 1 && (
          <Path d={toPath(stroke)} stroke={C.pred} strokeWidth={4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        )}
      </Svg>
      {stroke.length === 0 && !active && (
        <View style={s.hint} pointerEvents="none">
          <Text style={s.hintText}>Draw where SOL goes next 60s</Text>
          <Text style={s.hintSub}>left → right · centre line = price now</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pad: { height: PAD_HEIGHT, backgroundColor: C.card, borderRadius: R.card, borderWidth: 1, borderColor: C.line, overflow: "hidden" },
  hint: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  hintText: { color: C.text, fontSize: 17, fontWeight: "600" },
  hintSub: { color: C.dim, marginTop: 6 },
});
