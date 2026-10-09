export const C = {
  bg: "#0a0014",
  purple: "#1800AD",
  lime: "#C1FF72",
  pink: "#FF6B9D",
  blue: "#6BFFFF",
  white: "#FFFFFF",
  red: "#F87171",
  green: "#6EE7B7",
  gold: "#FBBF24",
};

export const F = {
  venite: "Venite",
  // Chakra Petch carries the UI text (no 900 weight, so "black" shares bold); Press Start 2P is for numbers.
  regular: "ChakraPetch_400Regular",
  bold: "ChakraPetch_600SemiBold",
  black: "ChakraPetch_700Bold",
  mono: "PressStart2P_400Regular",
};

export const RAINBOW = ["#ff0000", "#ff9900", "#ffff00", "#33ff00", "#0099ff", "#6633ff"];

export const fade = (hex: string, a: number) => {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
};
