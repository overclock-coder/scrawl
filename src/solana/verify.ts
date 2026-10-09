import { Transaction, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";

const COMPUTE_BUDGET = "ComputeBudget111111111111111111111111111111";
const LIGHTHOUSE = "L2TExMFKdjpN9kozasaurPirfHy9P8sbXoAN1qA3S95";

const same = (a: TransactionInstruction, b: TransactionInstruction) =>
  a.programId.equals(b.programId) &&
  Buffer.from(a.data).equals(Buffer.from(b.data)) &&
  a.keys.length === b.keys.length &&
  a.keys.every((k, i) => k.pubkey.equals(b.keys[i].pubkey) && k.isSigner === b.keys[i].isSigner && k.isWritable === b.keys[i].isWritable);

/**
 * A wallet may legitimately add compute-budget (priority fee) and Lighthouse (assertion) instructions.
 * Anything else, or any change to our own instructions, means the transaction was altered.
 */
export function onlyBenignChanges(original: Transaction, signed: Transaction): boolean {
  if (!signed.feePayer || !original.feePayer || !signed.feePayer.equals(original.feePayer)) return false;
  const rest = [...signed.instructions];
  for (const ours of original.instructions) {
    const i = rest.findIndex((x) => same(x, ours));
    if (i < 0) return false;
    rest.splice(i, 1);
  }
  return rest.every((x) => [COMPUTE_BUDGET, LIGHTHOUSE].includes(x.programId.toBase58()));
}
