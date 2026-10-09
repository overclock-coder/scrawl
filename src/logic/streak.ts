export const dayKey = (ms: number) => {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export interface Streak {
  count: number;
  lastDay: string | null;
}

/** Same day keeps the streak, the next day extends it, a gap resets it. */
export function bumpStreak(s: Streak, nowMs: number): Streak {
  const today = dayKey(nowMs);
  if (s.lastDay === today) return s;
  const prev = new Date(nowMs);
  prev.setDate(prev.getDate() - 1);
  return { count: s.lastDay === dayKey(prev.getTime()) ? s.count + 1 : 1, lastDay: today };
}
