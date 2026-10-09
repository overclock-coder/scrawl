import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { DAILY_BONUS, START_BALANCE } from "../config";
import { bumpStreak, dayKey, Streak } from "../logic/streak";
import { RoundRecord } from "../logic/types";
import { load, save } from "../services/kv";
import { restoreSession, Session } from "../solana/wallet";

interface Profile {
  balance: number;
  streak: Streak;
  bonusDay: string | null;
  history: RoundRecord[];
}

const INITIAL: Profile = { balance: START_BALANCE, streak: { count: 0, lastDay: null }, bonusDay: null, history: [] };
const KEY = "profile.v1";
const MAX_HISTORY = 100;

interface Store extends Profile {
  ready: boolean;
  session: Session | null;
  setSession: (s: Session | null) => void;
  /** Take the stake out of the balance when a round starts. */
  stakeOut: (amount: number) => void;
  /** Record a finished round: pay out, extend the streak, store history. */
  finishRound: (r: RoundRecord) => void;
  patchRound: (id: string, patch: Partial<RoundRecord>) => void;
  claimBonus: () => number;
  bonusAvailable: boolean;
}

const Ctx = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [p, setP] = useState<Profile>(INITIAL);
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const latest = useRef(p);
  latest.current = p;

  useEffect(() => {
    (async () => {
      setP(await load(KEY, INITIAL));
      setSession(await restoreSession());
      setReady(true);
    })();
  }, []);

  useEffect(() => {
    if (ready) void save(KEY, p);
  }, [p, ready]);

  const stakeOut = useCallback((amount: number) => setP((s) => ({ ...s, balance: s.balance - amount })), []);

  const finishRound = useCallback((r: RoundRecord) => {
    setP((s) => ({
      ...s,
      balance: r.live ? s.balance : s.balance + r.score.payout,
      streak: bumpStreak(s.streak, r.startedAt),
      history: [r, ...s.history].slice(0, MAX_HISTORY),
    }));
  }, []);

  const patchRound = useCallback((id: string, patch: Partial<RoundRecord>) => {
    setP((s) => ({ ...s, history: s.history.map((h) => (h.id === id ? { ...h, ...patch } : h)) }));
  }, []);

  const bonusAvailable = p.bonusDay !== dayKey(Date.now());

  const claimBonus = useCallback(() => {
    if (latest.current.bonusDay === dayKey(Date.now())) return 0;
    setP((s) => ({ ...s, balance: s.balance + DAILY_BONUS, bonusDay: dayKey(Date.now()) }));
    return DAILY_BONUS;
  }, []);

  const value = useMemo<Store>(
    () => ({ ...p, ready, session, setSession, stakeOut, finishRound, patchRound, claimBonus, bonusAvailable }),
    [p, ready, session, stakeOut, finishRound, patchRound, claimBonus, bonusAvailable]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const v = useContext(Ctx);
  if (!v) throw new Error("StoreProvider missing");
  return v;
}
