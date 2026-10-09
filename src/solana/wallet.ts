import { transact, Web3MobileWallet } from "@solana-mobile/mobile-wallet-adapter-protocol-web3js";
import { Connection, PublicKey, Transaction, TransactionInstruction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Buffer } from "buffer";
import { APP_IDENTITY, CLUSTER, RPC_URL } from "../config";
import { MEMO_PROGRAM_ID } from "../logic/commit";
import { solToLamports } from "../logic/onchain";
import { openPositionIx, positionAddress } from "./program";
import { secureGet, secureSet } from "../services/kv";

const TOKEN_KEY = "mwa.authToken";
const ADDR_KEY = "mwa.address";
const CHAIN = `solana:${CLUSTER}` as const;

export const connection = new Connection(RPC_URL, "confirmed");

export interface Session {
  address: string;
}

async function authorize(wallet: Web3MobileWallet): Promise<PublicKey> {
  const cached = await secureGet(TOKEN_KEY);
  let res;
  try {
    res = await wallet.authorize({ chain: CHAIN, identity: APP_IDENTITY, ...(cached ? { auth_token: cached } : {}) });
  } catch (e) {
    if (!cached) throw e;
    // Token revoked or expired: fall back to a fresh authorize.
    res = await wallet.authorize({ chain: CHAIN, identity: APP_IDENTITY });
  }
  await secureSet(TOKEN_KEY, res.auth_token);
  const pk = new PublicKey(Buffer.from(res.accounts[0].address, "base64"));
  await secureSet(ADDR_KEY, pk.toBase58());
  return pk;
}

export async function restoreSession(): Promise<Session | null> {
  const address = await secureGet(ADDR_KEY);
  return address ? { address } : null;
}

export async function connectWallet(): Promise<Session> {
  const pk = await transact((wallet) => authorize(wallet));
  return { address: pk.toBase58() };
}

export async function disconnectWallet(): Promise<void> {
  const token = await secureGet(TOKEN_KEY);
  await secureSet(TOKEN_KEY, null);
  await secureSet(ADDR_KEY, null);
  if (!token) return;
  try {
    await transact((wallet) => wallet.deauthorize({ auth_token: token }));
  } catch {
    /* local state is already cleared */
  }
}

/**
 * Write a memo on-chain, signed and sent by the wallet. The blockhash is fetched
 * after the wallet session is authorised (devnet blockhashes expire in ~36s), and
 * the transaction is built here so the memo text is exactly what we show the user.
 */
export async function sendMemo(text: string): Promise<{ signature: string; address: string }> {
  return transact(async (wallet) => {
    const owner = await authorize(wallet);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const tx = new Transaction({ feePayer: owner, blockhash, lastValidBlockHeight }).add(
      new TransactionInstruction({
        programId: new PublicKey(MEMO_PROGRAM_ID),
        keys: [{ pubkey: owner, isSigner: true, isWritable: false }],
        data: Buffer.from(text, "utf8"),
      })
    );
    const [signature] = await wallet.signAndSendTransactions({ transactions: [tx] });
    return { signature, address: owner.toBase58() };
  });
}

/**
 * Stake `count` back-to-back 60s positions in ONE wallet approval: one open_position per minute, each started
 * 60s after the last. The drawing commitment is stored on-chain with every position.
 */
export async function openPositions(a: { count: number; stakeSol: number; leverage: number; commitment: Uint8Array }) {
  return transact(async (wallet) => {
    const owner = await authorize(wallet);
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
    const base = BigInt(Date.now());
    const tx = new Transaction({ feePayer: owner, blockhash, lastValidBlockHeight });
    const positions: string[] = [];
    for (let i = 0; i < a.count; i++) {
      const nonce = base + BigInt(i);
      tx.add(openPositionIx({ user: owner, nonce, amount: solToLamports(a.stakeSol), leverage: a.leverage, commitment: a.commitment, slot: i }));
      positions.push(positionAddress(owner, nonce).toBase58());
    }
    const [signature] = await wallet.signAndSendTransactions({ transactions: [tx] });
    return { signature, positions, address: owner.toBase58() };
  });
}

export async function getBalanceSol(address: string): Promise<number> {
  return (await connection.getBalance(new PublicKey(address))) / LAMPORTS_PER_SOL;
}

export async function airdrop(address: string): Promise<string> {
  const sig = await connection.requestAirdrop(new PublicKey(address), LAMPORTS_PER_SOL);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({ signature: sig, ...latest }, "confirmed");
  return sig;
}

export async function confirm(signature: string): Promise<boolean> {
  const latest = await connection.getLatestBlockhash();
  const res = await connection.confirmTransaction({ signature, ...latest }, "confirmed");
  return !res.value.err;
}
