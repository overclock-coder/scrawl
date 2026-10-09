import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";
import Svg, { Line, Path } from "react-native-svg";
import { appendPoint } from "../logic/sampling";
import { Point } from "../logic/types";
import { C, F, fade } from "./theme";

export const PAD_HEIGHT = 200;

interface Props {
  stroke: Point[];
  onStroke: (s: Point[]) => void;
  onSize: (w: number) => void;
  width: number;
  onDrawing?: (drawing: boolean) => void;
}

export const toPath = (pts: Point[]) => pts.map((p, i) => `${i ? "L" : "M"}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");

/**
 * Finger-drawn prediction canvas with neon stroke. Strokes are forced left-to-right (see appendPoint).
 * The stroke lives in this component while the finger is down (redrawn at most once per frame) and is handed
 * to the screen on release, so drawing never re-renders the rest of the Play screen.
 */
export function DrawPad({ stroke, onStroke, onSize, width, onDrawing }: Props) {
  const ref = useRef<Point[]>(stroke);
  const [local, setLocal] = useState<Point[]>(stroke);
  const frame = useRef<number | null>(null);
  const drawingRef = useRef(false);
  const push = (next: Point[]) => {
    ref.current = next;
    if (frame.current === null) {
      frame.current = requestAnimationFrame(() => {
        frame.current = null;
        setLocal(ref.current);
      });
    }
  };
  // Parent cleared or replaced the stroke (not while the finger is down).
  useEffect(() => {
    if (!drawingRef.current && stroke !== ref.current) {
      ref.current = stroke;
      setLocal(stroke);
    }
  }, [stroke]);
  useEffect(() => () => { if (frame.current !== null) cancelAnimationFrame(frame.current); }, []);
  const widthRef = useRef(width);
  widthRef.current = width;
  const [active, setActive] = useState(false);
  const nudge = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([Animated.timing(nudge, { toValue: 10, duration: 500, useNativeDriver: true }), Animated.timing(nudge, { toValue: 0, duration: 500, useNativeDriver: true })]));
    loop.start();
    return () => loop.stop();
  }, [nudge]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: (e) => {
          drawingRef.current = true;
          setActive(true);
          onDrawing?.(true);
          const { locationX: x, locationY: y } = e.nativeEvent;
          push(appendPoint([], { x, y: Math.min(Math.max(y, 0), PAD_HEIGHT) }, widthRef.current));
        },
        onPanResponderMove: (e) => {
          const { locationX: x, locationY: y } = e.nativeEvent;
          const next = appendPoint(ref.current, { x, y: Math.min(Math.max(y, 0), PAD_HEIGHT) }, widthRef.current);
          if (next !== ref.current) push(next);
        },
        onPanResponderRelease: () => {
          drawingRef.current = false;
          setActive(false);
          setLocal(ref.current);
          onStroke(ref.current);
          onDrawing?.(false);
        },
        onPanResponderTerminate: () => {
          drawingRef.current = false;
          setActive(false);
          setLocal(ref.current);
          onStroke(ref.current);
          onDrawing?.(false);
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const d = local.length > 1 ? toPath(local) : "";
  return (
    <View style={s.pad} onLayout={(e) => onSize(e.nativeEvent.layout.width)} {...pan.panHandlers}>
      <Svg width={width} height={PAD_HEIGHT} pointerEvents="none">
        <Line x1={width * 0.025} x2={width * 0.975} y1={PAD_HEIGHT / 2} y2={PAD_HEIGHT / 2} stroke={fade(C.lime, 0.4)} strokeDasharray="6 6" />
        {d ? <Path d={d} stroke={fade(C.lime, 0.25)} strokeWidth={16} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
        {d ? <Path d={d} stroke={C.lime} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round" /> : null}
      </Svg>
      <Text style={s.current}>current</Text>
      {local.length === 0 && !active && (
        <View style={s.hint} pointerEvents="none">
          <Text style={s.hintText}>Draw your prediction</Text>
          <Animated.Text style={[s.hintText, { marginLeft: 8, transform: [{ translateX: nudge }] }]}>→</Animated.Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  pad: { height: PAD_HEIGHT, backgroundColor: fade(C.purple, 0.3), borderRadius: 12, borderWidth: 3, borderColor: fade(C.lime, 0.5), overflow: "hidden" },
  current: { position: "absolute", right: 12, top: PAD_HEIGHT / 2 - 16, color: fade(C.lime, 0.55), fontSize: 9, fontFamily: F.bold },
  hint: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, paddingBottom: 90, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  hintText: { color: fade(C.lime, 0.6), fontSize: 14, fontFamily: F.bold },
});
