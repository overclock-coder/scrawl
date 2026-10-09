import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { Buffer } from "buffer";
import { FUTURES_PROGRAM_ID, encodeClosePosition, encodeOpenPosition } from "../logic/onchain";

export const PROGRAM_ID = new PublicKey(FUTURES_PROGRAM_ID);
export const [CONFIG_PDA] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);
export const [VAULT_PDA] = PublicKey.findProgramAddressSync([Buffer.from("vault")], PROGRAM_ID);

export function positionAddress(user: PublicKey, nonce: bigint): PublicKey {
  const n = new Uint8Array(8);
  new DataView(n.buffer).setBigUint64(0, nonce, true);
  return PublicKey.findProgramAddressSync([Buffer.from("position"), user.toBuffer(), n], PROGRAM_ID)[0];
}

export function openPositionIx(a: { user: PublicKey; nonce: bigint; amount: bigint; leverage: number; commitment: Uint8Array; slot: number }) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: CONFIG_PDA, isSigner: false, isWritable: false },
      { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
      { pubkey: positionAddress(a.user, a.nonce), isSigner: false, isWritable: true },
      { pubkey: a.user, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(encodeOpenPosition(a)),
  });
}

export function closePositionIx(a: { settler: PublicKey; position: PublicKey; user: PublicKey; pnl: bigint; actualCommitment: Uint8Array }) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: CONFIG_PDA, isSigner: false, isWritable: true },
      { pubkey: VAULT_PDA, isSigner: false, isWritable: true },
      { pubkey: a.position, isSigner: false, isWritable: true },
      { pubkey: a.user, isSigner: false, isWritable: true },
      { pubkey: a.settler, isSigner: true, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(encodeClosePosition(a)),
  });
}
