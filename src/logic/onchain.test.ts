import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { hashPrices } from "./commit";
import {
  POSITION_SIZE, capByLiquidity, commitmentBytes, decodePosition, discriminator, encodeClosePosition,
  encodeOpenPosition, pnlToLamports, solToLamports,
} from "./onchain";

const idl = JSON.parse(readFileSync(join(__dirname, "../../anchor/idl/line_futures.json"), "utf8"));
const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");

describe("program encoding matches the IDL", () => {
  it("instruction and account discriminators", () => {
    for (const ix of idl.instructions) expect(Array.from(discriminator("global", ix.name))).toEqual(ix.discriminator);
    for (const a of idl.accounts) expect(Array.from(discriminator("account", a.name))).toEqual(a.discriminator);
  });

  it("open_position layout: disc | nonce u64 | amount u64 | leverage u16 | commitment | slot", () => {
    const commitment = new Uint8Array(32).fill(7);
    const data = encodeOpenPosition({ nonce: 0x0102n, amount: 50_000_000n, leverage: 10, commitment, slot: 3 });
    expect(data.length).toBe(8 + 8 + 8 + 2 + 32 + 1);
    const dv = new DataView(data.buffer);
    expect(dv.getBigUint64(8, true)).toBe(0x0102n);
    expect(dv.getBigUint64(16, true)).toBe(50_000_000n);
    expect(dv.getUint16(24, true)).toBe(10);
    expect(Array.from(data.slice(26, 58))).toEqual(Array.from(commitment));
    expect(data[58]).toBe(3);
    const ix = idl.instructions.find((i: any) => i.name === "open_position");
    expect(ix.args.map((a: any) => a.name)).toEqual(["nonce", "amount", "leverage", "prediction_commitment", "slot_index"]);
  });

  it("close_position encodes a negative pnl as two's complement", () => {
    const data = encodeClosePosition({ pnl: -5n, actualCommitment: new Uint8Array(32).fill(1) });
    expect(new DataView(data.buffer).getBigInt64(8, true)).toBe(-5n);
    expect(data.length).toBe(8 + 8 + 32);
  });
});

describe("commitments", () => {
  it("bytes equal the hex hash used in the app", () => {
    const prices = Array.from({ length: 60 }, (_, i) => 150 + i * 0.01);
    expect(hex(commitmentBytes(prices))).toBe(hashPrices(prices));
  });
});

describe("decodePosition", () => {
  it("round-trips the on-chain layout", () => {
    const buf = new Uint8Array(POSITION_SIZE);
    buf.set(discriminator("account", "Position"), 0);
    const dv = new DataView(buf.buffer);
    buf.fill(9, 8, 40);
    dv.setBigUint64(40, 77n, true);
    dv.setBigUint64(48, 1_000_000_000n, true);
    dv.setUint16(56, 25, true);
    dv.setBigInt64(58, 1_700_000_000n, true);
    buf.fill(4, 66, 98);
    buf[98] = 1;
    const p = decodePosition(buf);
    expect(p).toMatchObject({ nonce: 77n, amount: 1_000_000_000n, leverage: 25, openTimestamp: 1_700_000_000, isOpen: true, pnl: 0n });
    expect(p.predictionCommitment[0]).toBe(4);
  });

  it("rejects other accounts", () => {
    expect(() => decodePosition(new Uint8Array(POSITION_SIZE))).toThrow("not a position");
    expect(() => decodePosition(new Uint8Array(10))).toThrow("too short");
  });
});

describe("pnl in lamports", () => {
  const amount = solToLamports(1);
  it("clamps to [-stake, stake * leverage]", () => {
    expect(pnlToLamports(-3, amount, 10)).toBe(-amount);
    expect(pnlToLamports(50, amount, 10)).toBe(amount * 10n);
    expect(pnlToLamports(0.1, amount, 10)).toBe(100_000_000n);
  });
  it("caps wins to what the vault can pay, keeping the fee in view", () => {
    expect(capByLiquidity(-5n, 100n, 0n)).toBe(-5n);
    expect(capByLiquidity(500n, 1000n, 900n)).toBe(0n); // vault cannot even return the stake
    const capped = capByLiquidity(10_000_000n, 1_000_000_000n, 1_005_000_000n);
    const fee = (capped * 200n) / 10_000n;
    expect(1_000_000_000n + capped - fee).toBeLessThanOrEqual(1_005_000_000n);
    expect(capByLiquidity(1n, 10n, 1_000n)).toBe(1n);
  });
});
