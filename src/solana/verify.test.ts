import { Keypair, SystemProgram, Transaction } from "@solana/web3.js";
import { describe, expect, it } from "vitest";
import { onlyBenignChanges } from "./verify";

const payer = Keypair.generate().publicKey;
const to = Keypair.generate().publicKey;
const make = (lamports: number, extra?: Keypair) => {
  const tx = new Transaction({ feePayer: payer, blockhash: "11111111111111111111111111111111", lastValidBlockHeight: 1 });
  tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: to, lamports }));
  if (extra) tx.add(SystemProgram.transfer({ fromPubkey: payer, toPubkey: extra.publicKey, lamports: 1 }));
  return tx;
};

describe("onlyBenignChanges", () => {
  it("accepts an identical transaction", () => expect(onlyBenignChanges(make(5), make(5))).toBe(true));
  it("rejects a changed amount", () => expect(onlyBenignChanges(make(5), make(6))).toBe(false));
  it("rejects an added transfer", () => expect(onlyBenignChanges(make(5), make(5, Keypair.generate()))).toBe(false));
  it("rejects a different fee payer", () => {
    const t = make(5);
    t.feePayer = to;
    expect(onlyBenignChanges(make(5), t)).toBe(false);
  });
});
